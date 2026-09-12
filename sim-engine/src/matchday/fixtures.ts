/** Fixture scheduling: Berger-table round robin for leagues and groups, knockout rounds for cups. */
import type { Ctx } from '../core/context.js';
import type { CompetitionCup, CompetitionLeague, Fixture } from '../core/schema.js';
import { nextId } from '../core/schema.js';

export type Pairing = [home: string, away: string];

/** Single round robin via the Berger table; each round every team plays once (or has a bye). */
export function bergerRoundRobin(teamsIn: readonly string[]): Pairing[][] {
  const teams = [...teamsIn];
  const BYE = '__bye__';
  if (teams.length % 2 === 1) teams.push(BYE);
  const n = teams.length;
  const rounds: Pairing[][] = [];
  const fixed = teams[n - 1];
  const rotating = teams.slice(0, n - 1);
  for (let r = 0; r < n - 1; r++) {
    const round: Pairing[] = [];
    // Alternate the fixed team's home/away so it does not always host.
    const first = rotating[0];
    round.push(r % 2 === 0 ? [first, fixed] : [fixed, first]);
    for (let i = 1; i < n / 2; i++) {
      const a = rotating[i];
      const b = rotating[n - 1 - i];
      round.push(i % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round.filter(([h, a]) => h !== BYE && a !== BYE));
    rotating.unshift(rotating.pop() as string);
  }
  return rounds;
}

/** Double round robin: mirrored second half with reversed venues. */
export function doubleRoundRobin(teams: readonly string[]): Pairing[][] {
  const first = bergerRoundRobin(teams);
  const second = first.map((round) => round.map(([h, a]): Pairing => [a, h]));
  return [...first, ...second];
}

/**
 * Weekly rhythm (weekday 0 = Monday of the season's first week):
 *   Tue continental, Wed domestic cup, Thu league cup, Sat league.
 */
export const FIRST_LEAGUE_WEEK = 4;
export const LEAGUE_MATCH_WEEKDAY = 5;
export const CUP_MATCH_WEEKDAY = 2;
export const CUP_FIRST_WEEK = 6;
export const CUP_WEEK_GAP = 4;
export const LEAGUE_CUP_WEEKDAY = 3;
export const LEAGUE_CUP_FIRST_WEEK = 5;
export const CONTINENTAL_WEEKDAY = 1;
export const CONTINENTAL_GROUP_WEEKS = [8, 10, 12, 14, 16, 18];
export const CONTINENTAL_FINAL_WEEK = 36;
export const CONTINENTAL_KNOCKOUT_GAP = 4;

/** Play-off days, counted from the start of the season. */
const PLAYOFF_SEMI_DAY = 353;
const PLAYOFF_GAP = 6;
/** Days between the two legs of a semi-final. */
const PLAYOFF_LEG_GAP = 3;

export function leagueRoundDay(world: Ctx['world'], round: number): number {
  return world.seasonStartDay + (FIRST_LEAGUE_WEEK + round - 1) * 7 + LEAGUE_MATCH_WEEKDAY;
}

export function cupRoundDay(world: Ctx['world'], round: number): number {
  return world.seasonStartDay + (CUP_FIRST_WEEK + (round - 1) * CUP_WEEK_GAP) * 7 + CUP_MATCH_WEEKDAY;
}

/** Day of a cup's knockout round, by cup kind. */
export function cupDay(world: Ctx['world'], comp: CompetitionCup, round: number): number {
  switch (comp.cupKind) {
    case 'leagueCup':
      return world.seasonStartDay + (LEAGUE_CUP_FIRST_WEEK + (round - 1) * CUP_WEEK_GAP) * 7 + LEAGUE_CUP_WEEKDAY;
    case 'continental': {
      const week = CONTINENTAL_FINAL_WEEK - (comp.totalRounds - round) * CONTINENTAL_KNOCKOUT_GAP;
      return world.seasonStartDay + week * 7 + CONTINENTAL_WEEKDAY;
    }
    case 'playoff':
      // After the league has finished, with a few days between the semi-finals
      // and the final.
      return world.seasonStartDay + PLAYOFF_SEMI_DAY + (round - 1) * PLAYOFF_GAP;
    default:
      return cupRoundDay(world, round);
  }
}

export function groupMatchday(world: Ctx['world'], matchday: number): number {
  const week = CONTINENTAL_GROUP_WEEKS[Math.min(matchday - 1, CONTINENTAL_GROUP_WEEKS.length - 1)];
  return world.seasonStartDay + week * 7 + CONTINENTAL_WEEKDAY;
}

function blankFixture(world: Ctx['world'], competitionId: string, season: number, round: number, day: number, home: string, away: string, knockout: boolean, group: number | null): Fixture {
  return {
    id: nextId(world, 'f', 6),
    competitionId,
    season,
    round,
    day,
    homeClubId: home,
    awayClubId: away,
    group,
    knockout,
    played: false,
    homeGoals: 0,
    awayGoals: 0,
    winnerId: null,
    report: null,
  };
}

export function scheduleLeague(ctx: Ctx, comp: CompetitionLeague): Fixture[] {
  const { world, rng } = ctx;
  const order = rng.shuffle([...comp.clubIds]);
  const rounds = doubleRoundRobin(order);
  const weeksAvailable = Math.floor(world.seasonLength / 7) - FIRST_LEAGUE_WEEK - 2;
  if (rounds.length > weeksAvailable) {
    throw new Error(`League ${comp.id} needs ${rounds.length} rounds but only ${weeksAvailable} weeks are available`);
  }
  const fixtures: Fixture[] = [];
  rounds.forEach((round, i) => {
    const day = leagueRoundDay(world, i + 1);
    for (const [home, away] of round) fixtures.push(blankFixture(world, comp.id, comp.season, i + 1, day, home, away, false, null));
  });
  return fixtures;
}

/** Group-stage fixtures: a double round robin inside each group. */
export function scheduleGroups(ctx: Ctx, comp: CompetitionCup): Fixture[] {
  const { world, rng } = ctx;
  const fixtures: Fixture[] = [];
  (comp.groups ?? []).forEach((group, g) => {
    const rounds = doubleRoundRobin(rng.shuffle([...group]));
    rounds.forEach((round, i) => {
      const day = groupMatchday(world, i + 1);
      for (const [home, away] of round) fixtures.push(blankFixture(world, comp.id, comp.season, i + 1, day, home, away, false, g));
    });
  });
  return fixtures;
}

export function cupRounds(entrants: number): number { return Math.max(1, Math.ceil(Math.log2(entrants))); }

/**
 * Pairs the alive clubs for the cup's current round. When the count is not a
 * power of two, the surplus clubs receive byes and stay alive without playing.
 */
export function scheduleCupRound(ctx: Ctx, comp: CompetitionCup): { fixtures: Fixture[]; byes: string[] } {
  const { world, rng } = ctx;
  // A cup draw is random; a play-off is seeded, so third plays sixth and the
  // club that finished higher has the home leg.
  const seeded = comp.cupKind === 'playoff';
  const alive = seeded
    ? [...comp.alive].sort((a, b) => comp.clubIds.indexOf(a) - comp.clubIds.indexOf(b))
    : rng.shuffle([...comp.alive]);
  // Largest power of two not exceeding the field; byes = 2p - n so the next round has exactly p clubs.
  const p = Math.pow(2, Math.floor(Math.log2(Math.max(1, alive.length))));
  const byeCount = alive.length === p ? 0 : 2 * p - alive.length;
  const byes = alive.slice(0, byeCount);
  const playing = alive.slice(byeCount);
  const day = cupDay(world, comp, comp.round);
  const fixtures: Fixture[] = [];
  if (seeded) {
    // The semi-finals are two legs, and neither can be settled on its own: a
    // leg that ends level stays level, and the tie is decided on aggregate.
    // The club that finished higher is at home for the second, as it should
    // be for finishing higher.
    const twoLegs = comp.round < comp.totalRounds;
    for (let i = 0; i < Math.floor(playing.length / 2); i++) {
      const higher = playing[i], lower = playing[playing.length - 1 - i];
      if (twoLegs) {
        fixtures.push(blankFixture(world, comp.id, comp.season, comp.round, day, lower, higher, false, null));
        fixtures.push(blankFixture(world, comp.id, comp.season, comp.round, day + PLAYOFF_LEG_GAP, higher, lower, false, null));
      } else {
        fixtures.push(blankFixture(world, comp.id, comp.season, comp.round, day, higher, lower, true, null));
      }
    }
    return { fixtures, byes };
  }
  for (let i = 0; i + 1 < playing.length; i += 2) {
    fixtures.push(blankFixture(world, comp.id, comp.season, comp.round, day, playing[i], playing[i + 1], true, null));
  }
  return { fixtures, byes };
}

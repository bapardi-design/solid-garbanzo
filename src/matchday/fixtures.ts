/** Fixture scheduling: Berger-table round robin for leagues, knockout rounds for cups. */
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

export const FIRST_LEAGUE_WEEK = 4;
export const LEAGUE_MATCH_WEEKDAY = 5;
export const CUP_MATCH_WEEKDAY = 2;
export const CUP_FIRST_WEEK = 6;
export const CUP_WEEK_GAP = 4;

export function leagueRoundDay(world: Ctx['world'], round: number): number {
  return world.seasonStartDay + (FIRST_LEAGUE_WEEK + round - 1) * 7 + LEAGUE_MATCH_WEEKDAY;
}

export function cupRoundDay(world: Ctx['world'], round: number): number {
  return world.seasonStartDay + (CUP_FIRST_WEEK + (round - 1) * CUP_WEEK_GAP) * 7 + CUP_MATCH_WEEKDAY;
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
    for (const [home, away] of round) {
      fixtures.push({
        id: nextId(world, 'f', 6),
        competitionId: comp.id,
        season: comp.season,
        round: i + 1,
        day,
        homeClubId: home,
        awayClubId: away,
        knockout: false,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        winnerId: null,
        report: null,
      });
    }
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
  const alive = rng.shuffle([...comp.alive]);
  // Largest power of two not exceeding the field; byes = 2p - n so the next round has exactly p clubs.
  const p = Math.pow(2, Math.floor(Math.log2(Math.max(1, alive.length))));
  const byeCount = alive.length === p ? 0 : 2 * p - alive.length;
  const byes = alive.slice(0, byeCount);
  const playing = alive.slice(byeCount);
  const day = cupRoundDay(world, comp.round);
  const fixtures: Fixture[] = [];
  for (let i = 0; i + 1 < playing.length; i += 2) {
    fixtures.push({
      id: nextId(world, 'f', 6),
      competitionId: comp.id,
      season: comp.season,
      round: comp.round,
      day,
      homeClubId: playing[i],
      awayClubId: playing[i + 1],
      knockout: true,
      played: false,
      homeGoals: 0,
      awayGoals: 0,
      winnerId: null,
      report: null,
    });
  }
  return { fixtures, byes };
}

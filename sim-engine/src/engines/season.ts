/** Season lifecycle: per-nation competitions, the continental cup, and end-of-season rollover. */
import type { Ctx } from '../core/context.js';
import type { CompetitionCup, CompetitionLeague, FinanceEntry, Nation, SeasonSummary } from '../core/index.js';
import { isRealWorld, tierCode, tierFromLeagueId } from '../core/schema.js';
import { continentalEntryFee, cupPrize, groupWinBonus, prizeMoney, setBudgets } from './finance.js';
import { chooseTactics, expireManagerContracts, fillManagerVacancies, boardReview } from './ai.js';
import { renewContracts, returnLoans } from './transfers.js';
import { revalue } from './development.js';
import { cupRounds, scheduleCupRound, scheduleGroups, scheduleLeague } from '../matchday/fixtures.js';
import { computeGroupTable, computeTable } from '../matchday/table.js';
import { contractLengthFor, generatePlayer, makeContract } from '../world/generate.js';
import { wageDemand } from '../rating.js';
import type { Position } from '../core/schema.js';
import { CONTINENTAL_CUP_NAME, NATIONS } from '../world/nations.js';
import { giveAwards } from './press.js';

export { tierFromLeagueId };

export function leagueCompId(nationId: string, season: number, tier: number): string { return `${tierCode(nationId, tier)}_S${season}`; }
export function cupCompId(nationId: string, season: number): string { return `${nationId}-CUP_S${season}`; }
export function leagueCupCompId(nationId: string, season: number): string { return `${nationId}-LC_S${season}`; }
export function continentalCompId(season: number): string { return `CONT_S${season}`; }

/** Clubs exchanged between tier `tier` and `tier + 1`. */
function exchangeFor(nation: Nation, tier: number, clubsInLower: number): number {
  const spec = NATIONS[nation.id];
  const fixed = spec?.exchange?.[tier - 1];
  if (fixed !== undefined) return fixed;
  return Math.min(3, Math.max(1, Math.floor(clubsInLower / 6)));
}

function knockoutCup(id: string, cupKind: CompetitionCup['cupKind'], name: string, nationId: string | null, season: number, clubIds: string[]): CompetitionCup {
  return {
    id, kind: 'cup', cupKind, name, nationId, season,
    clubIds, alive: clubIds, round: 1, totalRounds: cupRounds(clubIds.length),
    groups: null, groupRounds: 0, stage: 'knockout', complete: false, winnerId: null,
  };
}

export function startSeason(ctx: Ctx, season: number): void {
  const { world, rng } = ctx;
  ctx.emit('SEASON_STARTED', { season, startDay: world.day });
  const real = isRealWorld(world);
  const previous = world.history[world.history.length - 1] ?? null;

  for (const nation of Object.values(world.nations).sort((a, b) => a.id.localeCompare(b.id))) {
    // Clubs keep club.leagueId as the tier code (ENG-T2) or a previous season's
    // competition id; both resolve to a tier.
    const tiers = new Map<number, string[]>();
    for (const club of Object.values(world.clubs)) {
      if (club.nationId !== nation.id) continue;
      const tier = tierFromLeagueId(club.leagueId);
      (tiers.get(tier) ?? tiers.set(tier, []).get(tier)!).push(club.id);
    }
    const bottom = Math.max(...tiers.keys());
    for (const [tier, clubIds] of [...tiers.entries()].sort((a, b) => a[0] - b[0])) {
      const lowerCount = tiers.get(tier + 1)?.length ?? 0;
      const comp: CompetitionLeague = {
        id: leagueCompId(nation.id, world.season, tier),
        kind: 'league',
        name: nation.leagueNames[tier - 1] ?? `${nation.name} Division ${tier}`,
        nationId: nation.id,
        season: world.season,
        tier,
        clubIds: [...clubIds].sort(),
        promote: tier === 1 ? 0 : exchangeFor(nation, tier - 1, clubIds.length),
        relegate: tier === bottom ? 0 : exchangeFor(nation, tier, lowerCount),
        complete: false,
      };
      ctx.emit('COMPETITION_CREATED', { competition: comp });
      ctx.emit('FIXTURES_SCHEDULED', { fixtures: scheduleLeague(ctx, comp) });
    }

    if (world.config.cup) {
      const all = Object.values(world.clubs).filter((c) => c.nationId === nation.id).map((c) => c.id).sort();
      const cup = knockoutCup(cupCompId(nation.id, world.season), 'domestic', nation.cupName, nation.id, world.season, all);
      ctx.emit('COMPETITION_CREATED', { competition: cup });
      ctx.emit('FIXTURES_SCHEDULED', { fixtures: scheduleCupRound(ctx, cup).fixtures });
      if (nation.leagueCupName) {
        const lc = knockoutCup(leagueCupCompId(nation.id, world.season), 'leagueCup', nation.leagueCupName, nation.id, world.season, all);
        ctx.emit('COMPETITION_CREATED', { competition: lc });
        ctx.emit('FIXTURES_SCHEDULED', { fixtures: scheduleCupRound(ctx, lc).fixtures });
      }
    }
  }

  if (world.config.continental) startContinental(ctx, previous);

  // Youth intake.
  for (const club of Object.values(world.clubs)) {
    const intake = rng.int(2, 3);
    for (let i = 0; i < intake; i++) {
      const pos = rng.pick(['GK', 'DF', 'DF', 'MF', 'MF', 'FW'] as const satisfies readonly Position[]);
      const player = generatePlayer(ctx, club.id, pos, club.reputation * 0.8, rng.int(16, 18), club.nationId);
      ctx.emit('PLAYER_CREATED', { player });
      const contract = makeContract(ctx, player.id, club.id, wageDemand(player, real), contractLengthFor(player.age, rng));
      ctx.emit('CONTRACT_SIGNED', { contract, record: null });
    }
  }

  revalue(ctx);
  setBudgets(ctx);
  fillManagerVacancies(ctx);
  chooseTactics(ctx);
}

/** Top-flight clubs ranked by last season's finish (newly promoted clubs last), then reputation. */
function nationRanking(ctx: Ctx, nation: Nation, previous: SeasonSummary | null): string[] {
  const { world } = ctx;
  return Object.values(world.clubs)
    .filter((c) => c.nationId === nation.id && tierFromLeagueId(c.leagueId) === 1)
    .sort((a, b) => {
      const pa = previous?.positions[a.id] ?? 99;
      const pb = previous?.positions[b.id] ?? 99;
      return pa - pb || b.reputation - a.reputation || a.id.localeCompare(b.id);
    })
    .map((c) => c.id);
}

export function continentalEntrants(ctx: Ctx, previous: SeasonSummary | null): string[] {
  const { world } = ctx;
  const nations = Object.values(world.nations).filter((n) => n.continentalSlots > 0).sort((a, b) => b.coefficient - a.coefficient || a.id.localeCompare(b.id));
  if (nations.length === 0) return [];
  const rankings = new Map(nations.map((n) => [n.id, nationRanking(ctx, n, previous)]));
  const topFlight = [...rankings.values()].reduce((s, r) => s + r.length, 0);
  const target = topFlight >= 32 ? 32 : topFlight >= 16 ? 16 : 8;
  const entrants: string[] = [];
  const taken = new Map(nations.map((n) => [n.id, 0]));
  for (const n of nations) {
    const r = rankings.get(n.id)!;
    for (let i = 0; i < Math.min(n.continentalSlots, r.length) && entrants.length < target; i++) { entrants.push(r[i]); taken.set(n.id, i + 1); }
  }
  let progress = true;
  while (entrants.length < target && progress) {
    progress = false;
    for (const n of nations) {
      const r = rankings.get(n.id)!;
      const i = taken.get(n.id)!;
      if (i < r.length && entrants.length < target) { entrants.push(r[i]); taken.set(n.id, i + 1); progress = true; }
    }
  }
  return entrants;
}

function startContinental(ctx: Ctx, previous: SeasonSummary | null): void {
  const { world, rng } = ctx;
  const entrants = continentalEntrants(ctx, previous);
  if (entrants.length < 8) return;
  const groupCount = entrants.length / 4;
  // Seeded pots by reputation; each group takes one club from each pot.
  const seeded = [...entrants].sort((a, b) => world.clubs[b].reputation - world.clubs[a].reputation || a.localeCompare(b));
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  for (let pot = 0; pot < 4; pot++) {
    const members = rng.shuffle(seeded.slice(pot * groupCount, (pot + 1) * groupCount));
    members.forEach((id, i) => groups[i].push(id));
  }
  const comp: CompetitionCup = {
    id: continentalCompId(world.season), kind: 'cup', cupKind: 'continental', name: CONTINENTAL_CUP_NAME, nationId: null, season: world.season,
    clubIds: [...entrants].sort(), alive: [...entrants].sort(), round: 0, totalRounds: Math.round(Math.log2(groupCount * 2)),
    groups, groupRounds: 6, stage: 'groups', complete: false, winnerId: null,
  };
  ctx.emit('COMPETITION_CREATED', { competition: comp });
  ctx.emit('FIXTURES_SCHEDULED', { fixtures: scheduleGroups(ctx, comp) });
  const fee = continentalEntryFee(world);
  ctx.emit('FINANCE_POSTED', { entries: entrants.map((clubId) => ({ clubId, category: 'cup', amount: fee })) });
}

/** Called after a day's matches: advance cups whose current round is complete. */
export function advanceCups(ctx: Ctx): void {
  const { world } = ctx;
  for (const comp of Object.values(world.competitions)) {
    if (comp.kind !== 'cup' || comp.complete || comp.season !== world.season) continue;
    const fixtures = (world.idx.fixturesByCompetition[comp.id] ?? []).map((id) => world.fixtures[id]);
    if (comp.stage === 'groups') {
      const groupFixtures = fixtures.filter((f) => f.group !== null);
      if (groupFixtures.length === 0 || groupFixtures.some((f) => !f.played)) continue;
      const alive: string[] = [];
      const bonuses: FinanceEntry[] = [];
      const bonus = groupWinBonus(world);
      (comp.groups ?? []).forEach((_, g) => {
        const table = computeGroupTable(world, comp, g);
        for (const row of table.slice(0, 2)) alive.push(row.clubId);
        for (const row of table) if (row.won > 0) bonuses.push({ clubId: row.clubId, category: 'cup', amount: row.won * bonus });
      });
      if (bonuses.length) ctx.emit('FINANCE_POSTED', { entries: bonuses });
      ctx.emit('CUP_ROUND_ADVANCED', { competitionId: comp.id, round: 1, alive: alive.sort(), winnerId: null });
      ctx.emit('FIXTURES_SCHEDULED', { fixtures: scheduleCupRound(ctx, comp).fixtures });
      continue;
    }
    const roundFixtures = fixtures.filter((f) => f.group === null && f.round === comp.round);
    if (roundFixtures.length === 0 || roundFixtures.some((f) => !f.played)) continue;
    const played = new Set<string>();
    const winners: string[] = [];
    for (const f of roundFixtures) {
      played.add(f.homeClubId);
      played.add(f.awayClubId);
      if (f.winnerId) winners.push(f.winnerId);
    }
    const byes = comp.alive.filter((id) => !played.has(id));
    const alive = [...byes, ...winners].sort();
    const prizes: FinanceEntry[] = winners.map((id) => cupPrize(world, comp, id, comp.round));
    if (prizes.length) ctx.emit('FINANCE_POSTED', { entries: prizes });
    if (alive.length === 1) {
      ctx.emit('CUP_ROUND_ADVANCED', { competitionId: comp.id, round: comp.round, alive, winnerId: alive[0] });
    } else {
      ctx.emit('CUP_ROUND_ADVANCED', { competitionId: comp.id, round: comp.round + 1, alive, winnerId: null });
      ctx.emit('FIXTURES_SCHEDULED', { fixtures: scheduleCupRound(ctx, comp).fixtures });
    }
  }
}

export function endSeason(ctx: Ctx): void {
  const { world, rng } = ctx;
  const leagues = Object.values(world.competitions)
    .filter((c): c is CompetitionLeague => c.kind === 'league' && c.season === world.season)
    .sort((a, b) => a.nationId.localeCompare(b.nationId) || a.tier - b.tier);

  const squadSizes: Record<string, number> = {};
  for (const clubId of Object.keys(world.clubs).sort()) squadSizes[clubId] = (world.idx.squadByClub[clubId] ?? []).length;
  const summary: SeasonSummary = { season: world.season, champions: {}, promoted: [], relegated: [], topScorer: null, squadSizes, positions: {}, awards: [] };
  const leagueMoves: Record<string, string> = {};
  const prizes: FinanceEntry[] = [];
  const tables = new Map<string, ReturnType<typeof computeTable>>();
  for (const league of leagues) {
    const table = computeTable(world, league);
    tables.set(league.id, table);
    summary.champions[league.id] = table[0].clubId;
    for (const row of table) summary.positions[row.clubId] = row.position;
    prizes.push(...prizeMoney(league, table));
  }
  for (const comp of Object.values(world.competitions)) {
    if (comp.kind === 'cup' && comp.season === world.season && comp.winnerId) summary.champions[comp.id] = comp.winnerId;
  }
  // Promotion and relegation between adjacent tiers of the same nation.
  for (const league of leagues) {
    const lower = leagues.find((l) => l.nationId === league.nationId && l.tier === league.tier + 1);
    if (!lower) continue;
    const upperTable = tables.get(league.id)!;
    const lowerTable = tables.get(lower.id)!;
    const n = Math.min(league.relegate, lower.promote);
    const down = upperTable.slice(upperTable.length - n).map((r) => r.clubId);
    const up = lowerTable.slice(0, n).map((r) => r.clubId);
    for (const id of down) { leagueMoves[id] = tierCode(league.nationId, lower.tier); summary.relegated.push(id); }
    for (const id of up) { leagueMoves[id] = tierCode(league.nationId, league.tier); summary.promoted.push(id); }
  }
  for (const club of Object.values(world.clubs)) {
    if (!(club.id in leagueMoves)) leagueMoves[club.id] = tierCode(club.nationId, tierFromLeagueId(club.leagueId));
  }
  let top: SeasonSummary['topScorer'] = null;
  for (const id of Object.keys(world.players).sort()) {
    const p = world.players[id];
    if (p.retired) continue;
    if (!top || p.stats.goals > top.goals) top = { playerId: id, goals: p.stats.goals };
  }
  summary.topScorer = top;

  ctx.emit('FINANCE_POSTED', { entries: prizes });
  // Board decisions run before contracts expire so the sacking sees the manager.
  boardReview(ctx, true);
  expireManagerContracts(ctx);
  ctx.emit('SEASON_ENDED', { season: world.season, summary, leagueMoves });
  giveAwards(ctx, summary);

  returnLoans(ctx);
  renewContracts(ctx, true);
  for (const contract of Object.values(world.contracts)) {
    if (contract.endSeason <= world.season) {
      ctx.emit('CONTRACT_EXPIRED', { contractId: contract.id, playerId: contract.playerId, clubId: contract.clubId });
    }
  }
  // Retirements.
  for (const id of Object.keys(world.players).sort()) {
    const p = world.players[id];
    if (p.retired) continue;
    const unattachedFor = p.freeSince === null ? 0 : world.day - p.freeSince;
    const freeAgentTooLong = p.clubId === null && (p.age >= 31 || unattachedFor >= world.seasonLength);
    const retireChance = p.age >= 33 ? (p.age - 32) * 0.3 : 0;
    if (retireChance > 0 && rng.chance(retireChance)) {
      ctx.emit('PLAYER_RETIRED', { playerId: p.id, clubId: p.clubId, reason: 'age' });
    } else if (freeAgentTooLong) {
      ctx.emit('PLAYER_RETIRED', { playerId: p.id, clubId: p.clubId, reason: 'unattached' });
    }
  }
  ctx.emit('PLAYERS_AGED', { season: world.season });
}

/** Season lifecycle: competitions, start-of-season setup, and end-of-season rollover. */
import type { Ctx } from '../core/context.js';
import type { CompetitionCup, CompetitionLeague, FinanceEntry, SeasonSummary } from '../core/index.js';
import { cupPrize, prizeMoney, setBudgets } from './finance.js';
import { chooseTactics, expireManagerContracts, fillManagerVacancies, boardReview } from './ai.js';
import { renewContracts, returnLoans } from './transfers.js';
import { revalue } from './development.js';
import { cupRounds, scheduleCupRound, scheduleLeague } from '../matchday/fixtures.js';
import { computeTable } from '../matchday/table.js';
import { contractLengthFor, generatePlayer, leagueId, makeContract } from '../world/generate.js';
import { wageDemand } from '../rating.js';
import type { Position } from '../core/schema.js';

export function leagueCompId(season: number, tier: number): string { return `${leagueId(tier)}_S${season}`; }
export function cupCompId(season: number): string { return `CUP_S${season}`; }

export function startSeason(ctx: Ctx, season: number): void {
  const { world, rng } = ctx;
  ctx.emit('SEASON_STARTED', { season, startDay: world.day });

  // Leagues: clubs keep club.leagueId as the tier code (L1, L2) or a previous
  // season's competition id; both resolve to a tier.
  const tiers = new Map<number, string[]>();
  for (const club of Object.values(world.clubs)) {
    const tier = tierFromLeagueId(club.leagueId);
    (tiers.get(tier) ?? tiers.set(tier, []).get(tier)!).push(club.id);
  }
  for (const [tier, clubIds] of [...tiers.entries()].sort((a, b) => a[0] - b[0])) {
    const isTop = tier === 1;
    const isBottom = tier === world.config.leagues;
    const comp: CompetitionLeague = {
      id: leagueCompId(world.season, tier),
      kind: 'league',
      name: `Division ${tier}`,
      season: world.season,
      tier,
      clubIds: [...clubIds].sort(),
      promote: isTop ? 0 : Math.min(3, Math.max(1, Math.floor(clubIds.length / 6))),
      relegate: isBottom ? 0 : Math.min(3, Math.max(1, Math.floor(clubIds.length / 6))),
      complete: false,
    };
    ctx.emit('COMPETITION_CREATED', { competition: comp });
    ctx.emit('FIXTURES_SCHEDULED', { fixtures: scheduleLeague(ctx, comp) });
  }

  if (world.config.cup) {
    const all = Object.keys(world.clubs).sort();
    const cup: CompetitionCup = {
      id: cupCompId(world.season),
      kind: 'cup',
      name: 'National Cup',
      season: world.season,
      clubIds: all,
      alive: all,
      round: 1,
      totalRounds: cupRounds(all.length),
      complete: false,
      winnerId: null,
    };
    ctx.emit('COMPETITION_CREATED', { competition: cup });
    ctx.emit('FIXTURES_SCHEDULED', { fixtures: scheduleCupRound(ctx, cup).fixtures });
  }

  // Youth intake.
  for (const club of Object.values(world.clubs)) {
    const intake = rng.int(2, 3);
    for (let i = 0; i < intake; i++) {
      const pos = rng.pick(['GK', 'DF', 'DF', 'MF', 'MF', 'FW'] as const satisfies readonly Position[]);
      const player = generatePlayer(ctx, club.id, pos, club.reputation * 0.8, rng.int(16, 18));
      ctx.emit('PLAYER_CREATED', { player });
      const contract = makeContract(ctx, player.id, club.id, wageDemand(player), contractLengthFor(player.age, rng));
      ctx.emit('CONTRACT_SIGNED', { contract, record: null });
    }
  }

  revalue(ctx);
  setBudgets(ctx);
  fillManagerVacancies(ctx);
  chooseTactics(ctx);
}

export function tierFromLeagueId(id: string): number {
  const m = /^L(\d+)/.exec(id);
  return m ? Number(m[1]) : 1;
}

/** Called after a day's matches: advance cups whose current round is complete. */
export function advanceCups(ctx: Ctx): void {
  const { world } = ctx;
  for (const comp of Object.values(world.competitions)) {
    if (comp.kind !== 'cup' || comp.complete || comp.season !== world.season) continue;
    const roundFixtures = (world.idx.fixturesByCompetition[comp.id] ?? [])
      .map((id) => world.fixtures[id])
      .filter((f) => f.round === comp.round);
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
    const prizes: FinanceEntry[] = winners.map((id) => cupPrize(id, comp.round));
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
    .sort((a, b) => a.tier - b.tier);

  const summary: SeasonSummary = { season: world.season, champions: {}, promoted: [], relegated: [], topScorer: null };
  const leagueMoves: Record<string, string> = {};
  const prizes: FinanceEntry[] = [];
  const tables = new Map<number, ReturnType<typeof computeTable>>();
  for (const league of leagues) {
    const table = computeTable(world, league);
    tables.set(league.tier, table);
    summary.champions[league.id] = table[0].clubId;
    prizes.push(...prizeMoney(league, table));
  }
  for (const comp of Object.values(world.competitions)) {
    if (comp.kind === 'cup' && comp.season === world.season && comp.winnerId) summary.champions[comp.id] = comp.winnerId;
  }
  // Promotion and relegation between adjacent tiers.
  for (const league of leagues) {
    const lower = leagues.find((l) => l.tier === league.tier + 1);
    if (!lower) continue;
    const upperTable = tables.get(league.tier)!;
    const lowerTable = tables.get(lower.tier)!;
    const n = Math.min(league.relegate, lower.promote);
    const down = upperTable.slice(upperTable.length - n).map((r) => r.clubId);
    const up = lowerTable.slice(0, n).map((r) => r.clubId);
    for (const id of down) { leagueMoves[id] = leagueId(lower.tier); summary.relegated.push(id); }
    for (const id of up) { leagueMoves[id] = leagueId(league.tier); summary.promoted.push(id); }
  }
  for (const club of Object.values(world.clubs)) {
    if (!(club.id in leagueMoves)) leagueMoves[club.id] = leagueId(tierFromLeagueId(club.leagueId));
  }
  let top: SeasonSummary['topScorer'] = null;
  for (const id in world.players) {
    const p = world.players[id];
    if (!top || p.stats.goals > top.goals) top = { playerId: id, goals: p.stats.goals };
  }
  summary.topScorer = top;

  ctx.emit('FINANCE_POSTED', { entries: prizes });
  // Board decisions run before contracts expire so the sacking sees the manager.
  boardReview(ctx, true);
  expireManagerContracts(ctx);
  ctx.emit('SEASON_ENDED', { season: world.season, summary, leagueMoves });

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

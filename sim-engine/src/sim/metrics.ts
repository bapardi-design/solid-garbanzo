/** Season-level metrics used for calibration and regression checks. */
import { countEventTypes, type Event } from '../core/events.js';
import type { World } from '../core/schema.js';
import { overall } from '../rating.js';
import { tierFromLeagueId } from '../core/schema.js';

export interface SeasonMetrics {
  season: number;
  matches: number;
  goalsPerMatch: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  cleanSheetPct: number;
  maxScoreline: string;
  transfers: Record<string, number>;
  totalFees: number;
  avgContractLength: number;
  contractsSigned: number;
  freeAgents: number;
  injuries: number;
  sackings: number;
  retirements: number;
  droppedOut: number;
  avgSquadSize: number;
  balanceByTier: Record<string, number>;
  insolventClubs: number;
  avgOverallByTier: Record<string, number>;
  avgAge: number;
  eventCounts: Record<string, number>;
  topScorer: string | null;
}

export function seasonMetrics(world: World, season: number, events: readonly Event[]): SeasonMetrics {
  let matches = 0, goals = 0, home = 0, draw = 0, away = 0, cleanSheets = 0, maxGoals = -1, maxScoreline = '';
  const transfers: Record<string, number> = {};
  let fees = 0, contractSeasons = 0, contractsSigned = 0, injuries = 0, sackings = 0, retirements = 0, droppedOut = 0;
  for (const e of events) {
    switch (e.type) {
      case 'MATCH_PLAYED': {
        matches++;
        const { homeGoals: h, awayGoals: a } = e.payload;
        goals += h + a;
        if (h > a) home++; else if (h < a) away++; else draw++;
        if (h === 0 || a === 0) cleanSheets++;
        if (h + a > maxGoals) { maxGoals = h + a; maxScoreline = `${h}-${a}`; }
        break;
      }
      case 'PLAYER_TRANSFERRED':
        transfers[e.payload.record.kind] = (transfers[e.payload.record.kind] ?? 0) + 1;
        fees += e.payload.record.fee;
        contractSeasons += e.payload.contract.lengthSeasons;
        contractsSigned++;
        break;
      case 'LOAN_STARTED':
      case 'LOAN_RETURNED':
        transfers[e.payload.record.kind] = (transfers[e.payload.record.kind] ?? 0) + 1;
        break;
      case 'CONTRACT_SIGNED':
        if (e.payload.record) transfers.renewal = (transfers.renewal ?? 0) + 1;
        contractSeasons += e.payload.contract.lengthSeasons;
        contractsSigned++;
        break;
      case 'PLAYER_INJURED': injuries++; break;
      case 'MANAGER_SACKED': sackings++; break;
      case 'PLAYER_RETIRED': if (e.payload.reason === 'age') retirements++; else droppedOut++; break;
      default: break;
    }
  }
  const balanceByTier: Record<string, { sum: number; n: number }> = {};
  const ovrByTier: Record<string, { sum: number; n: number }> = {};
  let insolvent = 0, squadTotal = 0, ageSum = 0, ageN = 0;
  for (const club of Object.values(world.clubs)) {
    const tier = `T${tierFromLeagueId(club.leagueId)}`;
    (balanceByTier[tier] ??= { sum: 0, n: 0 });
    balanceByTier[tier].sum += club.balance; balanceByTier[tier].n++;
    if (club.balance < 0) insolvent++;
    const squad = world.idx.squadByClub[club.id] ?? [];
    squadTotal += squad.length;
    for (const pid of squad) {
      const p = world.players[pid];
      (ovrByTier[tier] ??= { sum: 0, n: 0 });
      ovrByTier[tier].sum += overall(p); ovrByTier[tier].n++;
      ageSum += p.age; ageN++;
    }
  }
  const avg = (r: Record<string, { sum: number; n: number }>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v.sum / Math.max(1, v.n))]));
  const summary = world.history.find((h) => h.season === season);
  const clubCount = Object.keys(world.clubs).length;
  return {
    season,
    matches,
    goalsPerMatch: round(goals / Math.max(1, matches), 2),
    homeWinPct: round((100 * home) / Math.max(1, matches), 1),
    drawPct: round((100 * draw) / Math.max(1, matches), 1),
    awayWinPct: round((100 * away) / Math.max(1, matches), 1),
    cleanSheetPct: round((100 * cleanSheets) / Math.max(1, matches), 1),
    maxScoreline,
    transfers,
    totalFees: fees,
    avgContractLength: round(contractSeasons / Math.max(1, contractsSigned), 2),
    contractsSigned,
    freeAgents: world.freeAgents.length,
    injuries,
    sackings,
    retirements,
    droppedOut,
    avgSquadSize: round(summary ? Object.values(summary.squadSizes).reduce((a, b) => a + b, 0) / Math.max(1, clubCount) : squadTotal / Math.max(1, clubCount), 1),
    balanceByTier: avg(balanceByTier),
    insolventClubs: insolvent,
    avgOverallByTier: avg(ovrByTier),
    avgAge: round(ageSum / Math.max(1, ageN), 1),
    eventCounts: countEventTypes(events),
    topScorer: summary?.topScorer ? `${world.players[summary.topScorer.playerId]?.name} (${summary.topScorer.goals})` : null,
  };
}

function round(x: number, d: number): number { const f = Math.pow(10, d); return Math.round(x * f) / f; }

/**
 * Browser entry point. Bundled by esbuild into a single IIFE exposing
 * `SimEngine` on window; everything here is free of Node built-ins.
 */
import { createCtx, type Ctx } from '../core/context.js';
import type { Event } from '../core/events.js';
import { Rng, hashString } from '../core/rng.js';
import { CUSTOM_CONFIG, DEFAULT_CONFIG, createEmptyWorld, isRealWorld, leagueOf, nationFromLeagueId, seasonDay, squad, tierOfClub, type Fixture, type MatchReport, type World, type WorldConfig } from '../core/schema.js';
import { generateWorld } from '../world/generate.js';
import { computeGroupTable, computeTable, positionOf } from '../matchday/table.js';
import { explainMatch, MAX_SUBS, type HalfTimeDecision } from '../matchday/match.js';
import { overall, averageRating } from '../rating.js';
import { tierFromLeagueId } from '../core/schema.js';
import { resumeHalfTime as resumeHalfTimeTick, tickDay, type TickOptions } from '../sim/tick.js';
import { seasonMetrics, type SeasonMetrics } from '../sim/metrics.js';
import { checkInvariants } from '../sim/invariants.js';
import * as actions from '../actions.js';
import { selectXI } from '../matchday/xi.js';
import { contractOf } from '../core/schema.js';
import { wageDemand, playerValue, effectiveRating, weeklyWageBill, squadStrength } from '../rating.js';
import { inTransferWindow, signingsThisWindow, SUMMER_WINDOW, WINTER_WINDOW } from '../engines/transfers.js';
import { currencyFor, money, ordinal, roundLabel } from '../engines/press.js';
import { MAX_LEVEL as MAX_FACILITY_LEVEL } from '../engines/boardroom.js';
import { NATIONS, CONTINENTAL_CUP_NAME } from '../world/nations.js';
import { REAL_WORLD } from '../world/data/index.js';
import { renderReport } from '../sim/report.js';
import type { RunResult } from '../sim/runner.js';

export interface Game {
  ctx: Ctx;
  world: World;
  /** Events of the season in progress; cleared when a season's metrics are taken. */
  seasonLog: Event[];
  seasons: SeasonMetrics[];
}

export interface GameSnapshot { version: 1; world: World; rng: ReturnType<Rng['state']> }

export function snapshotGame(game: Game): GameSnapshot {
  return { version: 1, world: structuredClone(game.world), rng: game.ctx.rng.state() };
}

export function resumeGame(snapshot: GameSnapshot): Game {
  const world = structuredClone(snapshot.world);
  migrate(world);
  const ctx = createCtx(world, new Rng(snapshot.rng));
  return { ctx, world, seasonLog: ctx.log, seasons: [] };
}

/**
 * Fills in fields added after a save was written, so careers started on an
 * older build keep working. The half-time score of an old match is recovered
 * from the goal minutes.
 */
function migrate(world: World): void {
  const w = world as World & { halfTime?: World['halfTime'] };
  if (w.halfTime === undefined) w.halfTime = null;
  for (const f of Object.values(world.fixtures)) {
    const r = f.report as (MatchReport & { subs?: MatchReport['subs']; second?: MatchReport['second']; tacticChange?: MatchReport['tacticChange']; halfTimeScore?: MatchReport['halfTimeScore'] }) | null;
    if (!r) continue;
    if (!r.subs) r.subs = [];
    if (r.second === undefined) r.second = null;
    if (r.tacticChange === undefined) r.tacticChange = null;
    if (!r.halfTimeScore) {
      r.halfTimeScore = {
        home: r.goals.filter((g) => g.minute <= 45 && g.clubId === f.homeClubId).length,
        away: r.goals.filter((g) => g.minute <= 45 && g.clubId === f.awayClubId).length,
      };
    }
  }
}

export function createGame(config: Partial<WorldConfig> = {}): Game {
  const cfg: WorldConfig = { ...DEFAULT_CONFIG, ...config };
  const world = createEmptyWorld(cfg);
  const ctx = createCtx(world, new Rng(cfg.seed));
  generateWorld(ctx, cfg);
  ctx.log.length = 0;
  return { ctx, world, seasonLog: ctx.log, seasons: [] };
}

/**
 * Advances `days` days. Returns the events emitted, and rolls season metrics
 * when a season ends. Stops early when a match pauses at half time.
 */
export function step(game: Game, days: number, opts: TickOptions = {}): Event[] {
  const { ctx, world } = game;
  const start = ctx.log.length;
  for (let i = 0; i < days; i++) {
    tickDay(ctx, opts);
    if (world.halfTime) return ctx.log.slice(start);
    const rolled = rollSeason(game, start);
    if (rolled) return rolled;
  }
  return ctx.log.slice(start);
}

/** Plays the second half of a paused match and finishes that day. */
export function resumeHalfTime(game: Game, decision: HalfTimeDecision = {}): Event[] {
  const { ctx } = game;
  const start = ctx.log.length;
  resumeHalfTimeTick(ctx, decision);
  return rollSeason(game, start) ?? ctx.log.slice(start);
}

function rollSeason(game: Game, start: number): Event[] | null {
  const { ctx, world } = game;
  if (seasonDay(world) !== world.seasonLength - 1) return null;
  game.seasons.push(seasonMetrics(world, world.season, ctx.log));
  const emitted = ctx.log.slice(start);
  ctx.log.length = 0;
  return emitted;
}

export function daysLeftInSeason(world: World): number {
  return world.seasonLength - 1 - seasonDay(world);
}

/** Cheap 32-bit hash of the stable serialisation, for on-screen identity. */
export function quickHash(world: World): string {
  const s = JSON.stringify(world, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, (v as Record<string, unknown>)[k]])) : v));
  return hashString(s).toString(16).padStart(8, '0');
}

export function fixturesOnDay(world: World, day: number): Fixture[] {
  return (world.idx.fixturesByDay[day] ?? []).map((id) => world.fixtures[id]);
}

/** Self-contained HTML report for the completed seasons of a career, or null before the first season ends. */
export function careerReport(game: Game): string | null {
  if (game.seasons.length === 0) return null;
  const result: RunResult = {
    world: game.world,
    rng: game.ctx.rng,
    seasons: game.seasons.map((metrics) => ({ season: metrics.season, metrics, hash: quickHash(game.world), invariantErrors: [], snapshotFile: null, elapsedMs: 0 })),
    events: [],
    totalEvents: game.seasons.reduce((s, m) => s + Object.values(m.eventCounts).reduce((a, b) => a + b, 0), 0),
    elapsedMs: 0,
  };
  return renderReport(result);
}

export const api = {
  ...actions,
  createGame, resumeGame, snapshotGame, step, resumeHalfTime, MAX_SUBS, daysLeftInSeason, quickHash, fixturesOnDay, careerReport, selectXI, contractOf, wageDemand, playerValue, effectiveRating, inTransferWindow,
  computeTable, computeGroupTable, positionOf, explainMatch, overall, averageRating, squad, seasonDay, leagueOf, tierFromLeagueId, tierOfClub, nationFromLeagueId, isRealWorld, checkInvariants,
  weeklyWageBill, squadStrength, signingsThisWindow, currencyFor, money, ordinal, roundLabel, MAX_FACILITY_LEVEL,
  DEFAULT_CONFIG, CUSTOM_CONFIG, NATIONS, REAL_WORLD, CONTINENTAL_CUP_NAME, SUMMER_WINDOW, WINTER_WINDOW,
};
export default api;

export type { HalfTimeDecision } from '../matchday/match.js';
export type { World, WorldConfig, Player, Club, Manager, Contract, Fixture, Competition, CompetitionLeague, CompetitionCup, MatchReport, GoalFactor, GoalEvent, Tactic, Position, TransferRecord, SeasonSummary, Nation, NewsItem, NewsCategory, TransferBid, HalfTimeState, MatchSub, Boardroom, Decision, DecisionOption, DecisionKind, Facilities } from '../core/schema.js';
export type { Event, EventType } from '../core/events.js';
export type { Standing } from '../matchday/table.js';
export type { Selection } from '../matchday/xi.js';
export type { SeasonMetrics } from '../sim/metrics.js';
export type { MarketEntry, BoardStatus, RenewalTerms, ActionResult, Vacancy, PlayerQuery, PlayerHit, ScoutReport, Honour, NewsQuery } from '../actions.js';
export type { Award } from '../core/events.js';

/**
 * Browser entry point. Bundled by esbuild into a single IIFE exposing
 * `SimEngine` on window; everything here is free of Node built-ins.
 */
import { createCtx, type Ctx } from '../core/context.js';
import type { Event } from '../core/events.js';
import { Rng, hashString } from '../core/rng.js';
import { CUSTOM_CONFIG, DEFAULT_CONFIG, createEmptyWorld, isRealWorld, leagueOf, nationFromLeagueId, seasonDay, squad, tierOfClub, type CardEvent, type CareerSeason, type Fixture, type MatchReport, type World, type WorldConfig } from '../core/schema.js';
import { generateWorld } from '../world/generate.js';
import { computeGroupTable, computeTable, positionOf } from '../matchday/table.js';
import { PLAYOFF_FIELD, playoffCompId } from '../engines/season.js';
import { explainMatch, isDerby, MAX_SUBS, type HalfTimeDecision } from '../matchday/match.js';
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
  const w = world as World & { halfTime?: World['halfTime']; boardroom?: World['boardroom']; training?: World['training'] };
  if (w.halfTime === undefined) w.halfTime = null;
  if (w.boardroom === undefined) w.boardroom = null;
  if (!w.training) w.training = 'balanced';
  if (w.halfTime) {
    // A save paused at half time, written before cards existed.
    const ht = w.halfTime as World['halfTime'] & { cards?: CardEvent[]; bookedHome?: string[]; bookedAway?: string[]; derby?: boolean };
    if (!ht.cards) ht.cards = [];
    if (!ht.bookedHome) ht.bookedHome = [];
    if (!ht.bookedAway) ht.bookedAway = [];
    if (typeof ht.derby !== 'boolean') ht.derby = false;
  }
  // A loan written before it recorded whose player it was, and the index of
  // who is out where, which no save has ever carried.
  world.idx.loanedOutBy = {};
  for (const p of Object.values(world.players)) {
    // A save written before careers were kept season by season: the seasons
    // already played cannot be recovered, so the record starts from here.
    if (!Array.isArray(p.seasons)) p.seasons = [];
    if (p.promisedGamesBy === undefined) p.promisedGamesBy = null;
    const q = p as typeof p & { suspension?: number };
    if (typeof q.suspension !== 'number') q.suspension = 0;
    const st = p.stats as typeof p.stats & { yellows?: number; reds?: number };
    if (typeof st.yellows !== 'number') st.yellows = 0;
    if (typeof st.reds !== 'number') st.reds = 0;
    if (!p.loan) continue;
    const owner = p.loan.fromClubId ?? contractOf(world, p.id)?.clubId;
    // Without an owner there is nobody to go back to, so the loan is dropped
    // and he stays where he is playing.
    if (!owner) { p.loan = null; continue; }
    p.loan.fromClubId = owner;
    (world.idx.loanedOutBy[owner] ??= []).push(p.id);
  }
  for (const f of Object.values(world.fixtures)) {
    const r = f.report as (MatchReport & { subs?: MatchReport['subs']; second?: MatchReport['second']; tacticChange?: MatchReport['tacticChange']; halfTimeScore?: MatchReport['halfTimeScore']; cards?: MatchReport['cards']; derby?: boolean; stats?: MatchReport['stats']; motmId?: MatchReport['motmId'] }) | null;
    if (!r) continue;
    if (!r.subs) r.subs = [];
    if (!r.cards) r.cards = [];
    if (!r.stats) {
      const shots = (lambda: number, scored: number) => Math.max(scored, Math.round(lambda * 7.5 + scored * 2.5));
      const hs = shots(r.lambda.home, f.homeGoals), as = shots(r.lambda.away, f.awayGoals);
      r.stats = {
        possession: { home: 50, away: 50 },
        shots: { home: hs, away: as },
        onTarget: { home: Math.max(f.homeGoals, Math.round(hs * 0.3)), away: Math.max(f.awayGoals, Math.round(as * 0.3)) },
        corners: { home: Math.round(hs * 0.4), away: Math.round(as * 0.4) },
      };
    }
    if (r.motmId === undefined) r.motmId = null;
    if (typeof r.derby !== 'boolean') r.derby = false;
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
  computeTable, computeGroupTable, positionOf, explainMatch, isDerby, playoffCompId, PLAYOFF_FIELD, overall, averageRating, squad, seasonDay, leagueOf, tierFromLeagueId, tierOfClub, nationFromLeagueId, isRealWorld, checkInvariants,
  weeklyWageBill, squadStrength, signingsThisWindow, currencyFor, money, ordinal, roundLabel, MAX_FACILITY_LEVEL,
  DEFAULT_CONFIG, CUSTOM_CONFIG, NATIONS, REAL_WORLD, CONTINENTAL_CUP_NAME, SUMMER_WINDOW, WINTER_WINDOW,
};
export default api;

export type { HalfTimeDecision } from '../matchday/match.js';
export type { CareerSeason, World, WorldConfig, Player, Club, Manager, Contract, Fixture, Competition, CompetitionLeague, CompetitionCup, MatchReport, GoalFactor, GoalEvent, CardEvent, CardKind, TrainingFocus, Tactic, Position, TransferRecord, SeasonSummary, Nation, NewsItem, NewsCategory, TransferBid, HalfTimeState, MatchSub, Boardroom, Decision, DecisionOption, DecisionKind, Facilities } from '../core/schema.js';
export type { Event, EventType } from '../core/events.js';
export type { Standing } from '../matchday/table.js';
export type { Selection } from '../matchday/xi.js';
export type { SeasonMetrics } from '../sim/metrics.js';
export type { MarketEntry, BoardStatus, RenewalTerms, ActionResult, Vacancy, PlayerQuery, PlayerHit, ScoutReport, Honour, NewsQuery, LoanSuitor } from '../actions.js';
export type { Concern, ConcernKind } from '../engines/morale.js';
export type { Award } from '../core/events.js';

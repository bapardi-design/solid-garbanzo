/**
 * Browser entry point. Bundled by esbuild into a single IIFE exposing
 * `SimEngine` on window; everything here is free of Node built-ins.
 */
import { createCtx, type Ctx } from '../core/context.js';
import type { Event } from '../core/events.js';
import { Rng, hashString } from '../core/rng.js';
import { DEFAULT_CONFIG, createEmptyWorld, leagueOf, seasonDay, squad, type Fixture, type World, type WorldConfig } from '../core/schema.js';
import { generateWorld } from '../world/generate.js';
import { computeTable } from '../matchday/table.js';
import { explainMatch } from '../matchday/match.js';
import { overall, averageRating } from '../rating.js';
import { tierFromLeagueId } from '../engines/season.js';
import { tickDay } from '../sim/tick.js';
import { seasonMetrics, type SeasonMetrics } from '../sim/metrics.js';
import { checkInvariants } from '../sim/invariants.js';
import * as actions from '../actions.js';
import { selectXI } from '../matchday/xi.js';
import { contractOf } from '../core/schema.js';
import { wageDemand, playerValue, effectiveRating } from '../rating.js';
import { inTransferWindow } from '../engines/transfers.js';

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
  const ctx = createCtx(world, new Rng(snapshot.rng));
  return { ctx, world, seasonLog: ctx.log, seasons: [] };
}

export function createGame(config: Partial<WorldConfig> = {}): Game {
  const cfg: WorldConfig = { ...DEFAULT_CONFIG, ...config };
  const world = createEmptyWorld(cfg);
  const ctx = createCtx(world, new Rng(cfg.seed));
  generateWorld(ctx, cfg);
  ctx.log.length = 0;
  return { ctx, world, seasonLog: ctx.log, seasons: [] };
}

/** Advances `days` days. Returns the events emitted, and rolls season metrics when a season ends. */
export function step(game: Game, days: number): Event[] {
  const { ctx, world } = game;
  const start = ctx.log.length;
  for (let i = 0; i < days; i++) {
    tickDay(ctx);
    if (seasonDay(world) === world.seasonLength - 1) {
      game.seasons.push(seasonMetrics(world, world.season, ctx.log));
      const emitted = ctx.log.slice(start);
      ctx.log.length = 0;
      return emitted;
    }
  }
  return ctx.log.slice(start);
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

export const api = {
  ...actions,
  createGame, resumeGame, snapshotGame, step, daysLeftInSeason, quickHash, fixturesOnDay, selectXI, contractOf, wageDemand, playerValue, effectiveRating, inTransferWindow,
  computeTable, explainMatch, overall, averageRating, squad, seasonDay, leagueOf, tierFromLeagueId, checkInvariants,
  DEFAULT_CONFIG,
};
export default api;

export type { World, WorldConfig, Player, Club, Manager, Contract, Fixture, Competition, CompetitionLeague, CompetitionCup, MatchReport, GoalFactor, GoalEvent, Tactic, Position, TransferRecord, SeasonSummary } from '../core/schema.js';
export type { Event, EventType } from '../core/events.js';
export type { Standing } from '../matchday/table.js';
export type { Selection } from '../matchday/xi.js';
export type { SeasonMetrics } from '../sim/metrics.js';
export type { MarketEntry, BoardStatus, RenewalTerms, ActionResult } from '../actions.js';

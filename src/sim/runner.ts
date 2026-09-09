/** Drives the simulation day by day and collects per-season output. */
import { createCtx, type Ctx } from '../core/context.js';
import type { Event } from '../core/events.js';
import { Rng } from '../core/rng.js';
import { createEmptyWorld, type World, type WorldConfig } from '../core/schema.js';
import { generateWorld } from '../world/generate.js';
import { checkInvariants } from './invariants.js';
import { seasonMetrics, type SeasonMetrics } from './metrics.js';
import { hashWorld, saveSnapshot } from './snapshot.js';
import { tickDay } from './tick.js';

export interface RunOptions {
  config: WorldConfig;
  seasons: number;
  /** Directory for per-season snapshots; omit to keep everything in memory. */
  outDir?: string;
  /** Throw when invariants fail (default true). */
  strict?: boolean;
  /** Keep the full event log on the result (memory heavy for many seasons). */
  keepEvents?: boolean;
  onSeason?: (info: SeasonResult) => void;
}

export interface SeasonResult {
  season: number;
  metrics: SeasonMetrics;
  hash: string;
  invariantErrors: string[];
  snapshotFile: string | null;
  elapsedMs: number;
}

export interface RunResult {
  world: World;
  seasons: SeasonResult[];
  events: Event[];
  totalEvents: number;
  elapsedMs: number;
}

export function createWorld(config: WorldConfig): Ctx {
  const world = createEmptyWorld(config);
  const ctx = createCtx(world, new Rng(config.seed));
  generateWorld(ctx, config);
  return ctx;
}

export function runSeasons(opts: RunOptions): RunResult {
  const started = Date.now();
  const ctx = createWorld(opts.config);
  const { world } = ctx;
  const strict = opts.strict ?? true;
  const seasons: SeasonResult[] = [];
  const allEvents: Event[] = opts.keepEvents ? [...ctx.log] : [];
  let totalEvents = ctx.log.length;
  ctx.log.length = 0;

  for (let s = 0; s < opts.seasons; s++) {
    const seasonStart = Date.now();
    const target = (s + 1) * world.seasonLength - 1;
    while (world.day < target) tickDay(ctx);
    const season = world.season;
    const invariantErrors = checkInvariants(world);
    if (strict && invariantErrors.length) {
      throw new Error(`Invariant violations after season ${season}:\n  ${invariantErrors.join('\n  ')}`);
    }
    const metrics = seasonMetrics(world, season, ctx.log);
    const hash = hashWorld(world);
    const snapshotFile = opts.outDir ? saveSnapshot(opts.outDir, world, `s${season}`) : null;
    const result: SeasonResult = { season, metrics, hash, invariantErrors, snapshotFile, elapsedMs: Date.now() - seasonStart };
    seasons.push(result);
    opts.onSeason?.(result);
    totalEvents += ctx.log.length;
    if (opts.keepEvents) allEvents.push(...ctx.log);
    ctx.log.length = 0;
  }
  return { world, seasons, events: allEvents, totalEvents, elapsedMs: Date.now() - started };
}

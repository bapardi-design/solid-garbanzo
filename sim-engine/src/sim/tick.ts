/** One simulated day. Everything that happens goes through ctx.emit. */
import type { Ctx } from '../core/context.js';
import { seasonDay } from '../core/schema.js';
import { boardReview, chooseTactics, fillManagerVacancies, isMidSeasonReviewDay } from '../engines/ai.js';
import { revalue, weeklyDevelopment } from '../engines/development.js';
import { matchdayIncome, weeklyFinance } from '../engines/finance.js';
import { postMatchMorale, weeklyMorale } from '../engines/morale.js';
import { advanceCups, endSeason, startSeason } from '../engines/season.js';
import { inTransferWindow, renewContracts, runTransferDay } from '../engines/transfers.js';
import { finishMatch, simulateFirstHalf, simulateMatch, type HalfTimeDecision } from '../matchday/match.js';
import { dailyPress } from '../engines/press.js';
import { expireBids } from '../engines/bids.js';
import type { FinanceEntry } from '../core/events.js';

export interface TickOptions {
  /** Pause the human's match at half time so tactics and subs can change. */
  halfTime?: boolean;
}

function playMatch(ctx: Ctx, fixtureId: string, gate: FinanceEntry[]): void {
  const { world } = ctx;
  const fixture = world.fixtures[fixtureId];
  const outcome = simulateMatch(ctx, fixture);
  commit(ctx, fixtureId, outcome, gate);
}

function commit(ctx: Ctx, fixtureId: string, outcome: ReturnType<typeof simulateMatch>, gate: FinanceEntry[]): void {
  const { world } = ctx;
  ctx.emit('MATCH_PLAYED', {
    fixtureId,
    homeGoals: outcome.homeGoals,
    awayGoals: outcome.awayGoals,
    winnerId: outcome.winnerId,
    report: outcome.report,
    playerStats: outcome.playerStats,
  });
  for (const inj of outcome.injuries) ctx.emit('PLAYER_INJURED', inj);
  gate.push(matchdayIncome(world, world.fixtures[fixtureId], outcome.report.attendance));
  postMatchMorale(ctx, world.fixtures[fixtureId]);
}

/**
 * Plays the given fixtures in order. Stops and returns false if the human's
 * match reaches half time and they asked to take charge of it.
 */
function playFixtures(ctx: Ctx, fixtureIds: string[], opts: TickOptions): boolean {
  const { world } = ctx;
  const gate: FinanceEntry[] = [];
  const mine = opts.halfTime ? world.humanClubId : null;
  for (let i = 0; i < fixtureIds.length; i++) {
    const fid = fixtureIds[i];
    const fixture = world.fixtures[fid];
    if (!fixture || fixture.played) continue;
    if (mine && (fixture.homeClubId === mine || fixture.awayClubId === mine)) {
      const state = simulateFirstHalf(ctx, fixture, mine);
      state.remainingFixtureIds = fixtureIds.slice(i + 1);
      if (gate.length) ctx.emit('FINANCE_POSTED', { entries: gate });
      ctx.emit('HALF_TIME_REACHED', { state });
      return false;
    }
    playMatch(ctx, fid, gate);
  }
  if (gate.length) ctx.emit('FINANCE_POSTED', { entries: gate });
  return true;
}

/** Everything that happens before the day's fixtures. */
function startOfDay(ctx: Ctx): void {
  const { world } = ctx;
  ctx.today.length = 0;
  const day = world.day + 1;
  ctx.emit('DAY_ADVANCED', { day });
  const sd = seasonDay(world);
  if (world.day === 0) startSeason(ctx, world.season);
  else if (sd === world.seasonLength) startSeason(ctx, world.season + 1);
  const sd2 = seasonDay(world);
  const dow = sd2 % 7;
  if (dow === 0 && sd2 > 0) weeklyFinance(ctx);
  if (dow === 1 && inTransferWindow(world)) {
    renewContracts(ctx, false);
    runTransferDay(ctx);
  }
  if (dow === 3) chooseTactics(ctx);
  if (dow === 4) {
    weeklyDevelopment(ctx);
    weeklyMorale(ctx);
    if (sd2 % 28 === 4) revalue(ctx);
  }
}

/** Everything that happens after the day's fixtures. */
function endOfDay(ctx: Ctx, hadFixtures: boolean): void {
  const { world } = ctx;
  if (hadFixtures) advanceCups(ctx);
  if (isMidSeasonReviewDay(ctx)) {
    boardReview(ctx, false);
    fillManagerVacancies(ctx);
  }
  expireBids(ctx);
  if (seasonDay(world) === world.seasonLength - 1) endSeason(ctx);
  dailyPress(ctx);
}

export function tickDay(ctx: Ctx, opts: TickOptions = {}): void {
  const { world } = ctx;
  if (world.halfTime) throw new Error('a match is paused at half time: resume it first');
  startOfDay(ctx);
  const fixtureIds = [...(world.idx.fixturesByDay[world.day] ?? [])].sort();
  if (fixtureIds.length && !playFixtures(ctx, fixtureIds, opts)) return;
  endOfDay(ctx, fixtureIds.length > 0);
}

/** Plays the second half of the paused match and finishes the day. */
export function resumeHalfTime(ctx: Ctx, decision: HalfTimeDecision = {}): void {
  const { world } = ctx;
  const ht = world.halfTime;
  if (!ht) throw new Error('no match is paused at half time');
  const remaining = [...ht.remainingFixtureIds];
  const outcome = finishMatch(ctx, ht, decision);
  const gate: FinanceEntry[] = [];
  commit(ctx, ht.fixtureId, outcome, gate);
  for (const fid of remaining) {
    const fixture = world.fixtures[fid];
    if (!fixture || fixture.played) continue;
    playMatch(ctx, fid, gate);
  }
  if (gate.length) ctx.emit('FINANCE_POSTED', { entries: gate });
  endOfDay(ctx, true);
}

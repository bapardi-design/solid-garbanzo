/** One simulated day. Everything that happens goes through ctx.emit. */
import type { Ctx } from '../core/context.js';
import { seasonDay } from '../core/schema.js';
import { boardReview, chooseTactics, fillManagerVacancies, isMidSeasonReviewDay } from '../engines/ai.js';
import { revalue, weeklyDevelopment } from '../engines/development.js';
import { matchdayIncome, weeklyFinance } from '../engines/finance.js';
import { postMatchMorale, weeklyMorale } from '../engines/morale.js';
import { advanceCups, endSeason, startSeason } from '../engines/season.js';
import { inTransferWindow, renewContracts, runTransferDay } from '../engines/transfers.js';
import { simulateMatch } from '../matchday/match.js';

export function tickDay(ctx: Ctx): void {
  const { world } = ctx;
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

  const fixtureIds = [...(world.idx.fixturesByDay[world.day] ?? [])].sort();
  if (fixtureIds.length) {
    const gate = [];
    for (const fid of fixtureIds) {
      const fixture = world.fixtures[fid];
      if (fixture.played) continue;
      const outcome = simulateMatch(ctx, fixture);
      ctx.emit('MATCH_PLAYED', {
        fixtureId: fid,
        homeGoals: outcome.homeGoals,
        awayGoals: outcome.awayGoals,
        winnerId: outcome.winnerId,
        report: outcome.report,
        playerStats: outcome.playerStats,
      });
      for (const inj of outcome.injuries) ctx.emit('PLAYER_INJURED', inj);
      gate.push(matchdayIncome(fixture, outcome.report.attendance));
      postMatchMorale(ctx, fixture);
    }
    if (gate.length) ctx.emit('FINANCE_POSTED', { entries: gate });
    advanceCups(ctx);
  }

  if (isMidSeasonReviewDay(ctx)) {
    boardReview(ctx, false);
    fillManagerVacancies(ctx);
  }
  if (sd2 === world.seasonLength - 1) endSeason(ctx);
}

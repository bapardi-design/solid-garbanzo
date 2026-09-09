/** Club-level AI: tactics, board reviews, manager sackings and appointments. */
import type { Ctx } from '../core/context.js';
import type { CompetitionLeague, Tactic } from '../core/schema.js';
import { leagueOf, seasonDay } from '../core/schema.js';
import { squadStrength } from '../rating.js';
import { computeTable, positionOf } from '../matchday/table.js';
import { generateManager } from '../world/generate.js';

export function chooseTactics(ctx: Ctx): void {
  const { world } = ctx;
  const leagueAvg = new Map<string, number>();
  for (const comp of Object.values(world.competitions)) {
    if (comp.kind !== 'league' || comp.complete) continue;
    const avg = comp.clubIds.reduce((s, id) => s + squadStrength(world, id), 0) / comp.clubIds.length;
    leagueAvg.set(comp.id, avg);
  }
  for (const club of Object.values(world.clubs)) {
    if (club.id === world.humanClubId) continue;
    const avg = leagueAvg.get(club.leagueId);
    if (avg === undefined) continue;
    const manager = club.managerId ? world.managers[club.managerId] : null;
    const diff = squadStrength(world, club.id) - avg + (manager ? (manager.ability - 55) / 10 : -2);
    const tactic: Tactic = diff > 4 ? 'attacking' : diff < -4 ? 'defensive' : 'balanced';
    if (tactic !== club.tactic) ctx.emit('TACTIC_CHANGED', { clubId: club.id, tactic });
  }
}

function currentLeague(ctx: Ctx, clubId: string): CompetitionLeague | null {
  const league = leagueOf(ctx.world, clubId);
  return league && league.season === ctx.world.season ? league : null;
}

/**
 * Boards compare league position with the pre-season target. Mid-season reviews
 * also require poor recent form; the end-of-season review does not.
 */
export function boardReview(ctx: Ctx, final: boolean): void {
  const { world } = ctx;
  const tables = new Map<string, ReturnType<typeof computeTable>>();
  for (const club of Object.values(world.clubs)) {
    const managerId = club.managerId;
    if (!managerId) continue;
    const league = currentLeague(ctx, club.id);
    if (!league) continue;
    if (!tables.has(league.id)) tables.set(league.id, computeTable(world, league));
    const table = tables.get(league.id)!;
    const position = positionOf(table, club.id);
    const formPts = club.form.reduce((a, b) => a + b, 0);
    const tolerance = final ? 4 : 5;
    const underperforming = position > club.boardTarget + tolerance;
    const poorForm = final || (club.form.length >= 6 && formPts <= 4);
    if (underperforming && poorForm) {
      const reason = `${position}${final ? 'th at season end' : 'th'} vs target ${club.boardTarget}, form ${formPts}/${club.form.length * 3}`;
      ctx.emit('MANAGER_SACKED', { managerId, clubId: club.id, reason });
      if (club.id === world.humanClubId) ctx.emit('CAREER_ENDED', { clubId: club.id, reason });
    }
  }
}

/** Managers whose contracts end this season either get renewed or leave. */
export function expireManagerContracts(ctx: Ctx): void {
  const { world, rng } = ctx;
  for (const club of Object.values(world.clubs)) {
    // Capture the id first: expiring the contract clears club.managerId.
    const managerId = club.managerId;
    if (!managerId) continue;
    if (club.id === world.humanClubId) continue;
    const manager = world.managers[managerId];
    if (manager.contractEndSeason !== world.season) continue;
    const league = currentLeague(ctx, club.id);
    const position = league ? positionOf(computeTable(world, league), club.id) : club.boardTarget;
    const metTarget = position <= club.boardTarget + 1;
    if (metTarget && rng.chance(0.85)) {
      ctx.emit('MANAGER_APPOINTED', { managerId, clubId: club.id, contractEndSeason: world.season + rng.int(1, 3) });
    } else {
      ctx.emit('MANAGER_CONTRACT_EXPIRED', { managerId, clubId: club.id });
    }
  }
}

export function fillManagerVacancies(ctx: Ctx): void {
  const { world, rng } = ctx;
  for (const club of Object.values(world.clubs)) {
    if (club.managerId) continue;
    const pool = Object.values(world.managers)
      .filter((m) => m.clubId === null)
      .sort((a, b) => (b.ability - Math.abs(b.reputation - club.reputation) * 0.3) - (a.ability - Math.abs(a.reputation - club.reputation) * 0.3) || a.id.localeCompare(b.id));
    let managerId: string;
    if (pool.length > 0 && rng.chance(0.85)) {
      managerId = pool[Math.min(pool.length - 1, rng.int(0, 1))].id;
    } else {
      const manager = generateManager(ctx, null, club.reputation);
      ctx.emit('MANAGER_CREATED', { manager });
      managerId = manager.id;
    }
    ctx.emit('MANAGER_APPOINTED', { managerId, clubId: club.id, contractEndSeason: world.season + rng.int(1, 3) });
  }
}

export function isMidSeasonReviewDay(ctx: Ctx): boolean {
  const sd = seasonDay(ctx.world);
  return sd >= 84 && sd % 7 === 6 && Math.floor((sd - 84) / 7) % 8 === 0;
}

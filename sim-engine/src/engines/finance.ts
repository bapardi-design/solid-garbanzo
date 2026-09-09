/** Club finances: wages, sponsorship, gate receipts, prize money, budgets. */
import type { Ctx } from '../core/context.js';
import type { FinanceEntry } from '../core/events.js';
import type { CompetitionLeague, Fixture } from '../core/schema.js';
import { squad } from '../core/schema.js';
import { squadStrength, weeklyWageBill } from '../rating.js';
import type { Standing } from '../matchday/table.js';

export const TICKET_PRICE_K = 0.022;
export const SPONSOR_PER_REP_WEEKLY = 2.6;
/** Weekly running costs (staff, stadium, academy) per reputation point. */
export const OPERATIONS_PER_REP_WEEKLY = 2;

export function weeklyFinance(ctx: Ctx): void {
  const { world } = ctx;
  const entries: FinanceEntry[] = [];
  for (const club of Object.values(world.clubs)) {
    const wages = weeklyWageBill(world, club.id);
    if (wages > 0) entries.push({ clubId: club.id, category: 'wages', amount: -wages });
    entries.push({ clubId: club.id, category: 'sponsorship', amount: Math.round(club.reputation * SPONSOR_PER_REP_WEEKLY) });
    entries.push({ clubId: club.id, category: 'operations', amount: -Math.round(club.reputation * OPERATIONS_PER_REP_WEEKLY) });
  }
  ctx.emit('FINANCE_POSTED', { entries });
}

export function matchdayIncome(fixture: Fixture, attendance: number): FinanceEntry {
  return { clubId: fixture.homeClubId, category: 'gate', amount: Math.round(attendance * TICKET_PRICE_K) };
}

export function prizeMoney(comp: CompetitionLeague, table: Standing[]): FinanceEntry[] {
  const tierBase = comp.tier === 1 ? 5000 : comp.tier === 2 ? 1500 : 500;
  const perPlace = comp.tier === 1 ? 500 : comp.tier === 2 ? 120 : 40;
  return table.map((row) => ({
    clubId: row.clubId,
    category: 'prize',
    amount: tierBase + (table.length - row.position) * perPlace,
  }));
}

export function cupPrize(clubId: string, round: number): FinanceEntry {
  return { clubId, category: 'cup', amount: 150 * round * round };
}

/** Projected season income used to size wage and transfer budgets. */
export function projectedSeasonIncome(ctx: Ctx, clubId: string): number {
  const { world } = ctx;
  const club = world.clubs[clubId];
  const league = world.competitions[club.leagueId];
  const tier = league && league.kind === 'league' ? league.tier : 1;
  const homeGames = league && league.kind === 'league' ? league.clubIds.length - 1 : 15;
  const gate = club.stadiumCapacity * 0.7 * TICKET_PRICE_K * homeGames;
  const sponsor = club.reputation * SPONSOR_PER_REP_WEEKLY * 52;
  const prize = tier === 1 ? 7500 : tier === 2 ? 2200 : 700;
  const operations = club.reputation * OPERATIONS_PER_REP_WEEKLY * 52;
  return gate + sponsor + prize - operations;
}

export function setBudgets(ctx: Ctx): void {
  const { world } = ctx;
  const budgets: Record<string, { wageBudget: number; transferBudget: number; boardTarget: number }> = {};
  const leagues = Object.values(world.competitions).filter((c): c is CompetitionLeague => c.kind === 'league' && c.season === world.season);
  for (const league of leagues) {
    const ranked = [...league.clubIds].sort((a, b) => squadStrength(world, b) - squadStrength(world, a) || a.localeCompare(b));
    ranked.forEach((clubId, i) => {
      const club = world.clubs[clubId];
      const income = projectedSeasonIncome(ctx, clubId);
      // Rich clubs may run wages above income; poor clubs are held below it.
      const wageBudget = Math.round(Math.max(income * 1.1, income * 0.8 + club.balance * 0.25) / 52);
      const transferBudget = Math.round(Math.max(0, club.balance * 0.45 + (income - weeklyWageBill(world, clubId) * 52) * 0.25));
      budgets[clubId] = { wageBudget, transferBudget, boardTarget: i + 1 };
    });
  }
  ctx.emit('BUDGETS_SET', { budgets });
}

export function squadSize(ctx: Ctx, clubId: string): number {
  return squad(ctx.world, clubId).length;
}

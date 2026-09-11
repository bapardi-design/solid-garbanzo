/** Club finances: wages, commercial income, gate receipts, prize money, budgets. */
import type { Ctx } from '../core/context.js';
import type { FinanceEntry } from '../core/events.js';
import type { CompetitionCup, CompetitionLeague, Fixture, World } from '../core/schema.js';
import { isRealWorld, squad, tierOfClub } from '../core/schema.js';
import { squadStrength, weeklyWageBill } from '../rating.js';
import type { Standing } from '../matchday/table.js';
import { NATIONS } from '../world/nations.js';
import { ticketFactor } from './boardroom.js';

export const TICKET_PRICE_K = 0.022;
export const SPONSOR_PER_REP_WEEKLY = 2.6;
/** Weekly running costs (staff, stadium, academy) per reputation point. */
export const OPERATIONS_PER_REP_WEEKLY = 2;

/** Real-world ticket prices by tier, in k. */
const REAL_TICKET_BY_TIER = [0.045, 0.028, 0.02, 0.016];
const REAL_TICKET_CONTINENTAL = 0.06;

/** Weekly commercial and broadcast income, in k. */
export function weeklyCommercial(world: World, reputation: number): number {
  if (!isRealWorld(world)) return Math.round(reputation * SPONSOR_PER_REP_WEEKLY);
  // Commercial income only: the television money arrives as prize money. A
  // mid-table top-flight club should see forty million a year here, not a
  // hundred, or it out-earns its wage bill and banks the difference forever.
  // The curve is steep at the top; the linear term is the shirt sponsor and
  // the local trade that even a fourth-tier club sells.
  return Math.round(Math.pow(reputation / 100, 4) * 2000 + reputation * 0.8);
}

/** Weekly running costs, in k. */
export function weeklyOperations(world: World, reputation: number): number {
  if (!isRealWorld(world)) return Math.round(reputation * OPERATIONS_PER_REP_WEEKLY);
  // Costs follow the same curve as income. On a shallower one a big club's
  // revenue outruns its running costs and it simply banks the difference
  // season after season, which is not how a football club works.
  return Math.round(Math.pow(reputation / 100, 4) * 2600 + 15);
}

export function weeklyFinance(ctx: Ctx): void {
  const { world } = ctx;
  const entries: FinanceEntry[] = [];
  for (const club of Object.values(world.clubs)) {
    const wages = weeklyWageBill(world, club.id);
    if (wages > 0) entries.push({ clubId: club.id, category: 'wages', amount: -wages });
    entries.push({ clubId: club.id, category: 'sponsorship', amount: weeklyCommercial(world, club.reputation) });
    entries.push({ clubId: club.id, category: 'operations', amount: -weeklyOperations(world, club.reputation) });
  }
  ctx.emit('FINANCE_POSTED', { entries });
}

export function ticketPrice(world: World, fixture: Fixture): number {
  if (!isRealWorld(world)) return TICKET_PRICE_K;
  const comp = world.competitions[fixture.competitionId];
  if (comp?.kind === 'cup' && comp.cupKind === 'continental') return REAL_TICKET_CONTINENTAL;
  const tier = comp?.kind === 'league' ? comp.tier : tierOfClub(world, fixture.homeClubId);
  return REAL_TICKET_BY_TIER[Math.min(tier, REAL_TICKET_BY_TIER.length) - 1];
}

export function matchdayIncome(world: World, fixture: Fixture, attendance: number): FinanceEntry {
  const price = ticketPrice(world, fixture) * ticketFactor(world, fixture.homeClubId);
  return { clubId: fixture.homeClubId, category: 'gate', amount: Math.round(attendance * price) };
}

function prizeSpec(nationId: string | null, tier: number): { base: number; perPlace: number } {
  const spec = (nationId && NATIONS[nationId]) || NATIONS.CUS;
  const i = Math.min(tier, spec.prize.base.length) - 1;
  return { base: spec.prize.base[i], perPlace: spec.prize.perPlace[i] };
}

export function prizeMoney(comp: CompetitionLeague, table: Standing[]): FinanceEntry[] {
  const { base, perPlace } = prizeSpec(comp.nationId, comp.tier);
  return table.map((row) => ({
    clubId: row.clubId,
    category: 'prize',
    amount: base + (table.length - row.position) * perPlace,
  }));
}

export function cupPrize(world: World, comp: CompetitionCup, clubId: string, round: number): FinanceEntry {
  if (!isRealWorld(world)) return { clubId, category: 'cup', amount: 150 * round * round };
  const amount = comp.cupKind === 'continental' ? 6000 + 1500 * round : comp.cupKind === 'leagueCup' ? 60 * round * round : 120 * round * round;
  return { clubId, category: 'cup', amount };
}

/** Paid to every club entering the continental group stage. */
export function continentalEntryFee(world: World): number { return isRealWorld(world) ? 9000 : 800; }
export function groupWinBonus(world: World): number { return isRealWorld(world) ? 2000 : 100; }

/** Projected season income used to size wage and transfer budgets. */
export function projectedSeasonIncome(ctx: Ctx, clubId: string): number {
  const { world } = ctx;
  const club = world.clubs[clubId];
  const league = world.competitions[club.leagueId];
  const tier = league && league.kind === 'league' ? league.tier : 1;
  const n = league && league.kind === 'league' ? league.clubIds.length : 16;
  const homeGames = n - 1;
  const real = isRealWorld(world);
  const price = real ? REAL_TICKET_BY_TIER[Math.min(tier, REAL_TICKET_BY_TIER.length) - 1] : TICKET_PRICE_K;
  const gate = club.stadiumCapacity * (real ? 0.85 : 0.7) * price * homeGames;
  const sponsor = weeklyCommercial(world, club.reputation) * 52;
  const spec = prizeSpec(club.nationId, tier);
  const prize = real ? spec.base + spec.perPlace * (n / 2) : tier === 1 ? 7500 : tier === 2 ? 2200 : 700;
  const operations = weeklyOperations(world, club.reputation) * 52;
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
      // Never below what the club already pays: existing contracts are commitments.
      const wageBudget = Math.round(Math.max(income * 1.1, income * 0.8 + club.balance * 0.25, weeklyWageBill(world, clubId) * 52 * 1.05) / 52);
      const transferBudget = Math.round(Math.max(0, club.balance * 0.45 + (income - weeklyWageBill(world, clubId) * 52) * 0.25));
      budgets[clubId] = { wageBudget, transferBudget, boardTarget: i + 1 };
    });
  }
  ctx.emit('BUDGETS_SET', { budgets });
}

export function squadSize(ctx: Ctx, clubId: string): number {
  return squad(ctx.world, clubId).length;
}

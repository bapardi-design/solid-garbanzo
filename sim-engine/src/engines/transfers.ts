/** Transfer market: signings, free agents, loans, and contract renewals. */
import type { Ctx } from '../core/context.js';
import type { Player, Position, TransferRecord } from '../core/schema.js';
import { MAX_SQUAD, POSITIONS, bottomTier, contractOf, isRealWorld, nextId, ownSquadSize, seasonDay, squad, squadTarget, tierOfClub } from '../core/schema.js';
import { LOAN_WAGE_SHARE, overall, squadStrength, wageDemand, weeklyWageBill } from '../rating.js';
import { FORMATIONS } from '../matchday/xi.js';
import { contractLengthFor, makeContract } from '../world/generate.js';
import { aiBidsForHuman } from './bids.js';
import { clamp } from '../core/rng.js';

// The squad a club carries is a property of the world, not of the market, so
// it lives with the rest of the world's shape; the market is where it is read.
export { MAX_SQUAD, ownSquadSize, squadTarget };

export const SUMMER_WINDOW: [number, number] = [0, 27];
export const WINTER_WINDOW: [number, number] = [168, 195];
export const MIN_PER_POSITION: Record<Position, number> = { GK: 2, DF: 6, MF: 6, FW: 3 };
/** Loans a club will take at once. */
export const MAX_LOANS_IN = 3;

const MAX_SIGNINGS_PER_DAY = 2;
/** Real-world clubs rebuild gradually: paid or free signings per window. */
const MAX_SIGNINGS_PER_WINDOW = 4;

export function signingsThisWindow(world: Ctx['world'], clubId: string): number {
  const sd = seasonDay(world);
  const windowStart = world.seasonStartDay + (sd >= WINTER_WINDOW[0] ? WINTER_WINDOW[0] : SUMMER_WINDOW[0]);
  let n = 0;
  for (let i = world.transfers.length - 1; i >= 0; i--) {
    const t = world.transfers[i];
    if (t.day < windowStart) break;
    if (t.toClubId === clubId && (t.kind === 'transfer' || t.kind === 'free')) n++;
  }
  return n;
}

export function inTransferWindow(world: Ctx['world']): boolean {
  const sd = seasonDay(world);
  return (sd >= SUMMER_WINDOW[0] && sd <= SUMMER_WINDOW[1]) || (sd >= WINTER_WINDOW[0] && sd <= WINTER_WINDOW[1]);
}

function ranked(players: Player[], pos: Position): Player[] {
  return players.filter((p) => p.position === pos).sort((a, b) => overall(b) - overall(a) || a.id.localeCompare(b.id));
}

/** Position rank at the club (1 = best). */
function rankAtClub(ctx: Ctx, p: Player): number {
  if (!p.clubId) return 99;
  return ranked(squad(ctx.world, p.clubId), p.position).findIndex((x) => x.id === p.id) + 1;
}

function starterSlots(pos: Position): number { return FORMATIONS.balanced.slots[pos]; }

export interface Listing { player: Player; askingPrice: number; fromClubId: string | null }

/** Players clubs would sell, and the price they want. */
export function buildMarket(ctx: Ctx): Listing[] {
  const { world } = ctx;
  const real = isRealWorld(world);
  const listings: Listing[] = [];
  for (const id of world.freeAgents) {
    const p = world.players[id];
    if (!p.retired) listings.push({ player: p, askingPrice: 0, fromClubId: null });
  }
  for (const club of Object.values(world.clubs)) {
    const players = squad(world, club.id).filter((p) => !p.loan);
    if (club.id === world.humanClubId) {
      for (const p of players) if (p.listedAt !== null) listings.push({ player: p, askingPrice: p.listedAt, fromClubId: club.id });
      continue;
    }
    const cashStrapped = club.balance < 0;
    const overloaded = ownSquadSize(world, club.id) > squadTarget(world, club.id);
    for (const pos of POSITIONS) {
      const byPos = ranked(players, pos);
      byPos.forEach((p, i) => {
        const rank = i + 1;
        const surplus = rank > starterSlots(pos) + 1;
        const c = contractOf(world, p.id);
        const expiring = c !== null && c.endSeason === world.season;
        let mult: number | null = null;
        if (cashStrapped && rank > 1) mult = 0.85;
        else if (overloaded && rank > starterSlots(pos)) mult = 0.75;
        else if (surplus) mult = 0.95;
        else if (expiring && p.age >= 27) mult = 0.7;
        else if (real) mult = club.reputation < 80 && rank <= starterSlots(pos) ? 2.2 : rank > starterSlots(pos) ? 1.5 : null;
        else if (rank > 1) mult = 1.6;
        if (mult !== null && byPos.length > MIN_PER_POSITION[pos]) {
          listings.push({ player: p, askingPrice: Math.round(p.value * mult), fromClubId: club.id });
        }
      });
    }
  }
  return listings;
}

/**
 * Worth a place on what he might become. The bar is a place in this side one
 * day, not merely room to improve: every teenager has room to improve, so a
 * club that kept all of them filled the squad with boys and released the men,
 * and the world's average player got younger and better every season.
 */
function comingGood(world: Ctx['world'], p: Player, clubId: string): boolean {
  return p.age < 24 && p.potential >= overall(p) + 5 && p.potential >= squadStrength(world, clubId) - 5;
}

export interface Need { pos: Position; minRating: number; priority: number }

export function clubNeeds(ctx: Ctx, clubId: string, leagueLine: Record<Position, number>): Need[] {
  const { world } = ctx;
  const players = squad(world, clubId);
  const needs: Need[] = [];
  for (const pos of POSITIONS) {
    const byPos = ranked(players, pos);
    const healthy = byPos.filter((p) => p.injuryDays < 30).length;
    if (healthy < MIN_PER_POSITION[pos]) {
      needs.push({ pos, minRating: 0, priority: 3 + (MIN_PER_POSITION[pos] - healthy) });
      continue;
    }
    const slots = starterSlots(pos);
    const starters = byPos.slice(0, slots);
    const line = starters.length ? starters.reduce((s, p) => s + overall(p), 0) / starters.length : 0;
    const weakest = starters.length ? overall(starters[starters.length - 1]) : 0;
    const club = world.clubs[clubId];
    const weakestValue = starters.length ? starters[starters.length - 1].value : 0;
    const room = squadTarget(world, clubId) - ownSquadSize(world, clubId);
    if (line < leagueLine[pos] - 2) needs.push({ pos, minRating: weakest + 3, priority: 2 });
    else if (club.transferBudget > weakestValue * 3 && room > 0) needs.push({ pos, minRating: weakest + 2, priority: 1.5 });
    else if (room > 0) needs.push({ pos, minRating: weakest - 15, priority: 1 });
  }
  return needs.sort((a, b) => b.priority - a.priority);
}

export function leagueLines(ctx: Ctx, leagueId: string): Record<Position, number> {
  const { world } = ctx;
  const comp = world.competitions[leagueId];
  const out: Record<Position, number> = { GK: 50, DF: 50, MF: 50, FW: 50 };
  if (!comp || comp.kind !== 'league') return out;
  for (const pos of POSITIONS) {
    let sum = 0, n = 0;
    for (const cid of comp.clubIds) {
      const starters = ranked(squad(world, cid), pos).slice(0, starterSlots(pos));
      for (const p of starters) { sum += overall(p); n++; }
    }
    out[pos] = n ? sum / n : 50;
  }
  return out;
}

function record(ctx: Ctx, player: Player, fromClubId: string | null, toClubId: string, fee: number, kind: TransferRecord['kind']): TransferRecord {
  return { id: nextId(ctx.world, 't'), season: ctx.world.season, day: ctx.world.day, playerId: player.id, fromClubId, toClubId, fee, kind };
}

export function runTransferDay(ctx: Ctx): void {
  const { world, rng } = ctx;
  const market = buildMarket(ctx);
  const sold = new Set<string>();
  const clubs = rng.shuffle(Object.values(world.clubs).map((c) => c.id));
  const lineCache = new Map<string, Record<Position, number>>();
  const real = isRealWorld(world);
  const priceScale = real ? 12000 : 2000;

  for (const clubId of clubs) {
    if (clubId === world.humanClubId) continue;
    const club = world.clubs[clubId];
    if (!lineCache.has(club.leagueId)) lineCache.set(club.leagueId, leagueLines(ctx, club.leagueId));
    const needs = clubNeeds(ctx, clubId, lineCache.get(club.leagueId)!);
    let signings = 0;
    const alreadySigned = real ? signingsThisWindow(world, clubId) : 0;
    for (const need of needs) {
      if (signings >= MAX_SIGNINGS_PER_DAY) break;
      if (real && alreadySigned + signings >= MAX_SIGNINGS_PER_WINDOW && need.priority < 3) break;
      // The squad a club means to carry stops it adding depth, and nothing
      // else. A side below the league standard in a position still buys —
      // that is a replacement, not an addition — and one short of a position
      // buys whatever it takes. Given the whole cap for either, emergency
      // cover was how the small clubs crept back over their means every
      // summer.
      const spare = need.priority >= 3 ? 3 : need.priority >= 2 ? 2 : 0;
      if (ownSquadSize(world, clubId) >= Math.min(squadTarget(world, clubId) + spare, MAX_SQUAD)) continue;
      const wageRoom = club.wageBudget - weeklyWageBill(world, clubId);
      const candidates = market
        .filter((l) => l.player.position === need.pos && l.fromClubId !== clubId && !sold.has(l.player.id) && !l.player.retired)
        .filter((l) => overall(l.player) >= need.minRating && l.askingPrice <= club.transferBudget)
        .map((l) => {
          const wage = Math.round(Math.max(l.fromClubId ? contractOf(world, l.player.id)?.wage ?? 0 : 0, wageDemand(l.player, real)) * (l.fromClubId ? 1.1 : 1.0) * 10) / 10;
          return { l, wage, score: overall(l.player) + (l.player.age < 24 ? (l.player.potential - overall(l.player)) * 0.3 : 0) - l.askingPrice / priceScale };
        })
        .filter((c) => c.wage <= wageRoom)
        .sort((a, b) => b.score - a.score || a.l.player.id.localeCompare(b.l.player.id));
      if (candidates.length === 0) continue;
      const choice = candidates[Math.min(candidates.length - 1, rng.int(0, 2))];
      // Negotiations can fail; players prefer bigger clubs, and a good one
      // does not drop a division to sit in a worse side. Without the second
      // term the best players drained downwards every season and the
      // divisions converged on each other.
      const repGap = club.reputation - (choice.l.fromClubId ? world.clubs[choice.l.fromClubId].reputation : club.reputation);
      const standard = overall(choice.l.player) - (lineCache.get(club.leagueId)![need.pos] ?? 50);
      const tooGoodForUs = standard > 0 ? standard / 45 : 0;
      if (!rng.chance(clamp(0.75 + repGap / 200 - tooGoodForUs, 0.05, 0.97))) continue;
      const { player } = choice.l;
      const fee = choice.l.askingPrice;
      const contract = makeContract(ctx, player.id, clubId, choice.wage, contractLengthFor(player.age, rng));
      const kind = choice.l.fromClubId ? 'transfer' : 'free';
      ctx.emit('PLAYER_TRANSFERRED', { record: record(ctx, player, choice.l.fromClubId, clubId, fee, kind), contract });
      sold.add(player.id);
      signings++;
    }
  }
  runLoans(ctx, sold);
  aiBidsForHuman(ctx);
}

/**
 * Clubs that would take this player for the rest of the season: a division or
 * more below his own, with room in the squad, a hole where he plays and the
 * wages to cover him.
 *
 * `order` is the order to consider them in — the weekly run passes its own
 * shuffle so the draw stays where it was; anything else gets them by name.
 */
export function loanSuitors(ctx: Ctx, playerId: string, order?: string[], lineCache = new Map<string, Record<Position, number>>()): string[] {
  const { world } = ctx;
  const p = world.players[playerId];
  const ownerId = contractOf(world, playerId)?.clubId;
  if (!p || !ownerId) return [];
  const owner = world.clubs[ownerId];
  const ownerTier = tierOfClub(world, ownerId);
  if (ownerTier === bottomTier(world, owner.nationId)) return [];
  const wage = contractOf(world, p.id)?.wage ?? 0;
  return (order ?? Object.keys(world.clubs).sort()).filter((cid) => {
    if (cid === ownerId || cid === world.humanClubId) return false;
    const club = world.clubs[cid];
    if (club.nationId !== owner.nationId || tierOfClub(world, cid) <= ownerTier) return false;
    // A loanee sits on top of the squad a club pays for, because somebody else
    // is paying for him: what limits him is places, not money, so it is three
    // at a time and never past the cap everybody is held to. Counted against
    // the paid-for squad he had nowhere to go — the summer's signings fill a
    // club to exactly that line, and the loan market never opened at all.
    const here = squad(world, cid);
    if (here.length >= MAX_SQUAD) return false;
    if (here.filter((x) => x.loan).length >= MAX_LOANS_IN) return false;
    if (ownSquadSize(world, cid) > squadTarget(world, cid) + 2) return false;
    if (!lineCache.has(club.leagueId)) lineCache.set(club.leagueId, leagueLines(ctx, club.leagueId));
    const need = clubNeeds(ctx, cid, lineCache.get(club.leagueId)!).find((n) => n.pos === p.position);
    return need !== undefined && overall(p) >= need.minRating - 2 && wage * LOAN_WAGE_SHARE <= club.wageBudget - weeklyWageBill(world, cid);
  });
}

/** Send a player out until the end of the season. */
export function sendOnLoan(ctx: Ctx, playerId: string, hostId: string): void {
  const { world } = ctx;
  const p = world.players[playerId];
  const ownerId = contractOf(world, playerId)!.clubId;
  ctx.emit('LOAN_STARTED', { record: record(ctx, p, ownerId, hostId, 0, 'loan'), returnSeason: world.season });
}

function runLoans(ctx: Ctx, moved: Set<string>): void {
  const { world, rng } = ctx;
  const clubs = rng.shuffle(Object.values(world.clubs).map((c) => c.id));
  const lineCache = new Map<string, Record<Position, number>>();
  for (const ownerId of clubs) {
    if (ownerId === world.humanClubId) continue;
    const prospects = squad(world, ownerId)
      .filter((p) => !p.loan && p.age <= 22 && !moved.has(p.id) && p.potential >= overall(p) + 5 && rankAtClub(ctx, p) > starterSlots(p.position) + 1)
      .filter((p) => ranked(squad(world, ownerId), p.position).length > MIN_PER_POSITION[p.position]);
    if (prospects.length === 0) continue;
    const prospect = rng.pick(prospects);
    const willing = loanSuitors(ctx, prospect.id, clubs, lineCache);
    if (willing.length === 0) continue;
    sendOnLoan(ctx, prospect.id, rng.pick(willing));
    moved.add(prospect.id);
  }
}

/** Renew expiring contracts for players the club wants to keep. */
export function renewContracts(ctx: Ctx, finalCall: boolean): void {
  const { world, rng } = ctx;
  const real = isRealWorld(world);
  for (const club of Object.values(world.clubs)) {
    if (club.id === world.humanClubId && !finalCall) continue;
    const players = squad(world, club.id).filter((p) => !p.loan);
    const wageRoom = club.wageBudget - weeklyWageBill(world, club.id);
    let roomLeft = wageRoom;
    for (const p of players) {
      const c = contractOf(world, p.id);
      if (!c || c.endSeason !== world.season) continue;
      const rank = rankAtClub(ctx, p);
      const keyPlayer = rank <= starterSlots(p.position) + 2;
      const prospect = comingGood(world, p, club.id);
      // Squad depth: a useful backup gets another year. This used to be gated
      // on the squad being under its target, which after a summer's signings
      // it never is, so at twenty-four — when prospect cover runs out —
      // anybody not among the first eleven or two was let go. Between that
      // and an academy intake nothing filtered, a footballer's best years
      // emptied out of the world: the twenty-four to twenty-sevens fell from
      // a third of every squad to a tenth in eight seasons. The released list
      // is what handles an oversized squad, and it takes the worst first.
      const depth = rank <= starterSlots(p.position) + 4 && p.age < 32 && rng.chance(0.8);
      const tooOld = p.age >= 34;
      if (tooOld || !(keyPlayer || prospect || depth)) continue;
      if (!finalCall && !rng.chance(0.5)) continue;
      const wage = Math.max(c.wage, wageDemand(p, real));
      const extra = wage - c.wage;
      if (extra > roomLeft && club.balance < 0) continue;
      if (!rng.chance(0.4 + p.morale / 200)) continue;
      roomLeft -= extra;
      const contract = makeContract(ctx, p.id, club.id, wage, contractLengthFor(p.age, rng));
      ctx.emit('CONTRACT_SIGNED', { contract, record: record(ctx, p, club.id, club.id, 0, 'renewal') });
    }
  }
}

/**
 * The released list. A club carrying more than it can afford lets the bottom
 * of the squad go at the end of the season, paying off what is left of the
 * contract. Nothing else shifts a player nobody wants to buy, so without it
 * the small clubs sat above their means for as long as the world ran.
 */
export function releaseSurplus(ctx: Ctx): void {
  const { world } = ctx;
  for (const clubId of Object.keys(world.clubs).sort()) {
    if (clubId === world.humanClubId) continue;
    let over = ownSquadSize(world, clubId) - squadTarget(world, clubId);
    if (over <= 0) continue;
    const worstFirst = squad(world, clubId)
      .filter((p) => !p.loan)
      .sort((a, b) => overall(a) - overall(b) || a.id.localeCompare(b.id));
    for (const p of worstFirst) {
      if (over <= 0) break;
      const c = contractOf(world, p.id);
      // A contract that is up anyway needs no paying off, and nobody releases
      // a player they would pick.
      if (!c || c.endSeason <= world.season) continue;
      if (rankAtClub(ctx, p) <= starterSlots(p.position) + 1) continue;
      // Worst first puts the sixteen-year-olds at the head of the queue, and a
      // club that released its academy every summer would have no reason to
      // run one.
      if (comingGood(world, p, clubId)) continue;
      // Leave a spare in every position: released to the bone, clubs spent the
      // summer signing emergency cover and ended up over their means again.
      if (ranked(squad(world, clubId), p.position).length <= MIN_PER_POSITION[p.position] + 1) continue;
      const payoff = Math.round(c.wage * 52 * (c.endSeason - world.season + 1) * 0.5);
      ctx.emit('PLAYER_RELEASED', { playerId: p.id, clubId, payoff });
      over--;
    }
  }
}

export function returnLoans(ctx: Ctx): void {
  const { world } = ctx;
  for (const id in world.players) {
    const p = world.players[id];
    if (!p.loan || p.loan.returnSeason > world.season) continue;
    const c = contractOf(world, p.id);
    if (!c) continue;
    ctx.emit('LOAN_RETURNED', { record: record(ctx, p, p.loan.toClubId, c.clubId, 0, 'loan_return') });
  }
}

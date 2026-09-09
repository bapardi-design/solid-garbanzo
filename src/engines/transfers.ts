/** Transfer market: signings, free agents, loans, and contract renewals. */
import type { Ctx } from '../core/context.js';
import type { Player, Position, TransferRecord } from '../core/schema.js';
import { POSITIONS, contractOf, nextId, seasonDay, squad, tierOfClub } from '../core/schema.js';
import { overall, wageDemand, weeklyWageBill } from '../rating.js';
import { FORMATIONS } from '../matchday/xi.js';
import { contractLengthFor, makeContract } from '../world/generate.js';

export const SUMMER_WINDOW: [number, number] = [0, 27];
export const WINTER_WINDOW: [number, number] = [168, 195];
export const MIN_PER_POSITION: Record<Position, number> = { GK: 2, DF: 6, MF: 6, FW: 3 };
export const MAX_SQUAD = 30;
const MAX_SIGNINGS_PER_DAY = 2;

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

interface Listing { player: Player; askingPrice: number; fromClubId: string | null }

/** Players clubs would sell, and the price they want. */
function buildMarket(ctx: Ctx): Listing[] {
  const { world } = ctx;
  const listings: Listing[] = [];
  for (const id of world.freeAgents) {
    const p = world.players[id];
    if (!p.retired) listings.push({ player: p, askingPrice: 0, fromClubId: null });
  }
  for (const club of Object.values(world.clubs)) {
    const players = squad(world, club.id).filter((p) => !p.loan);
    const cashStrapped = club.balance < 0;
    for (const pos of POSITIONS) {
      const byPos = ranked(players, pos);
      byPos.forEach((p, i) => {
        const rank = i + 1;
        const surplus = rank > starterSlots(pos) + 1;
        const c = contractOf(world, p.id);
        const expiring = c !== null && c.endSeason === world.season;
        let mult: number | null = null;
        if (cashStrapped && rank > 1) mult = 0.85;
        else if (surplus) mult = 0.95;
        else if (expiring && p.age >= 27) mult = 0.7;
        else if (rank > 1) mult = 1.6;
        if (mult !== null && byPos.length > MIN_PER_POSITION[pos]) {
          listings.push({ player: p, askingPrice: Math.round(p.value * mult), fromClubId: club.id });
        }
      });
    }
  }
  return listings;
}

interface Need { pos: Position; minRating: number; priority: number }

function clubNeeds(ctx: Ctx, clubId: string, leagueLine: Record<Position, number>): Need[] {
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
    if (line < leagueLine[pos] - 2) needs.push({ pos, minRating: weakest + 3, priority: 2 });
    else if (players.length < world.config.squadSize) needs.push({ pos, minRating: weakest - 15, priority: 1 });
  }
  return needs.sort((a, b) => b.priority - a.priority);
}

function leagueLines(ctx: Ctx, leagueId: string): Record<Position, number> {
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

  for (const clubId of clubs) {
    const club = world.clubs[clubId];
    if (!lineCache.has(club.leagueId)) lineCache.set(club.leagueId, leagueLines(ctx, club.leagueId));
    const needs = clubNeeds(ctx, clubId, lineCache.get(club.leagueId)!);
    let signings = 0;
    for (const need of needs) {
      if (signings >= MAX_SIGNINGS_PER_DAY) break;
      if (squad(world, clubId).length >= MAX_SQUAD) break;
      const wageRoom = club.wageBudget - weeklyWageBill(world, clubId);
      const candidates = market
        .filter((l) => l.player.position === need.pos && l.fromClubId !== clubId && !sold.has(l.player.id) && !l.player.retired)
        .filter((l) => overall(l.player) >= need.minRating && l.askingPrice <= club.transferBudget)
        .map((l) => {
          const wage = Math.round(Math.max(l.fromClubId ? contractOf(world, l.player.id)?.wage ?? 0 : 0, wageDemand(l.player)) * (l.fromClubId ? 1.1 : 1.0));
          return { l, wage, score: overall(l.player) + (l.player.age < 24 ? (l.player.potential - overall(l.player)) * 0.3 : 0) - l.askingPrice / 2000 };
        })
        .filter((c) => c.wage <= wageRoom)
        .sort((a, b) => b.score - a.score || a.l.player.id.localeCompare(b.l.player.id));
      if (candidates.length === 0) continue;
      const choice = candidates[Math.min(candidates.length - 1, rng.int(0, 2))];
      // Negotiations can fail; players prefer bigger clubs.
      const repGap = club.reputation - (choice.l.fromClubId ? world.clubs[choice.l.fromClubId].reputation : club.reputation);
      if (!rng.chance(0.75 + repGap / 200)) continue;
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
}

function runLoans(ctx: Ctx, moved: Set<string>): void {
  const { world, rng } = ctx;
  const clubs = rng.shuffle(Object.values(world.clubs).map((c) => c.id));
  const lineCache = new Map<string, Record<Position, number>>();
  for (const ownerId of clubs) {
    const owner = world.clubs[ownerId];
    const ownerTier = tierOfClub(world, ownerId);
    const prospects = squad(world, ownerId)
      .filter((p) => !p.loan && p.age <= 22 && !moved.has(p.id) && p.potential >= overall(p) + 5 && rankAtClub(ctx, p) > starterSlots(p.position) + 1)
      .filter((p) => ranked(squad(world, ownerId), p.position).length > MIN_PER_POSITION[p.position]);
    if (prospects.length === 0) continue;
    const prospect = rng.pick(prospects);
    const hosts = clubs.filter((cid) => cid !== ownerId && tierOfClub(world, cid) > ownerTier && squad(world, cid).length < MAX_SQUAD);
    const willing = hosts.filter((cid) => {
      const club = world.clubs[cid];
      if (!lineCache.has(club.leagueId)) lineCache.set(club.leagueId, leagueLines(ctx, club.leagueId));
      const need = clubNeeds(ctx, cid, lineCache.get(club.leagueId)!).find((n) => n.pos === prospect.position);
      const wage = contractOf(world, prospect.id)?.wage ?? 0;
      return need !== undefined && overall(prospect) >= need.minRating - 2 && wage <= club.wageBudget - weeklyWageBill(world, cid);
    });
    if (willing.length === 0 || ownerTier === world.config.leagues) continue;
    const hostId = rng.pick(willing);
    ctx.emit('LOAN_STARTED', { record: record(ctx, prospect, ownerId, hostId, 0, 'loan'), returnSeason: world.season });
    moved.add(prospect.id);
    void owner;
  }
}

/** Renew expiring contracts for players the club wants to keep. */
export function renewContracts(ctx: Ctx, finalCall: boolean): void {
  const { world, rng } = ctx;
  for (const club of Object.values(world.clubs)) {
    const players = squad(world, club.id).filter((p) => !p.loan);
    const wageRoom = club.wageBudget - weeklyWageBill(world, club.id);
    let roomLeft = wageRoom;
    for (const p of players) {
      const c = contractOf(world, p.id);
      if (!c || c.endSeason !== world.season) continue;
      const rank = rankAtClub(ctx, p);
      const keyPlayer = rank <= starterSlots(p.position) + 2;
      const prospect = p.age < 24 && p.potential >= overall(p) + 5;
      // Squad depth: keep useful backups when the squad is not oversized.
      const depth = rank <= starterSlots(p.position) + 4 && players.length <= world.config.squadSize && p.age < 32 && rng.chance(0.6);
      const tooOld = p.age >= 34;
      if (tooOld || !(keyPlayer || prospect || depth)) continue;
      if (!finalCall && !rng.chance(0.5)) continue;
      const wage = Math.max(c.wage, wageDemand(p));
      const extra = wage - c.wage;
      if (extra > roomLeft && club.balance < 0) continue;
      if (!rng.chance(0.4 + p.morale / 200)) continue;
      roomLeft -= extra;
      const contract = makeContract(ctx, p.id, club.id, wage, contractLengthFor(p.age, rng));
      ctx.emit('CONTRACT_SIGNED', { contract, record: record(ctx, p, club.id, club.id, 0, 'renewal') });
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

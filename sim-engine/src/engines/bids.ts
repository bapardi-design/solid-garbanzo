/** AI clubs bidding for the human manager's players, and the human's answers. */
import type { Ctx } from '../core/context.js';
import type { TransferBid, TransferRecord } from '../core/schema.js';
import { contractOf, isRealWorld, nextId, squad } from '../core/schema.js';
import { overall, wageDemand, weeklyWageBill } from '../rating.js';
import { clubNeeds, inTransferWindow, leagueLines, MIN_PER_POSITION } from './transfers.js';
import { contractLengthFor, makeContract } from '../world/generate.js';
import { publish } from './press.js';

export const BID_DAYS = 7;

/** Runs on transfer days: at most one new approach for a human player per day. */
export function aiBidsForHuman(ctx: Ctx): void {
  const { world, rng } = ctx;
  const humanId = world.humanClubId;
  if (!humanId || !inTransferWindow(world)) return;
  const human = world.clubs[humanId];
  const mine = squad(world, humanId).filter((p) => !p.loan && !world.pendingBids.some((b) => b.playerId === p.id));
  if (mine.length === 0) return;
  const buyers = rng.shuffle(Object.values(world.clubs).filter((c) => c.id !== humanId && c.reputation >= human.reputation - 15 && c.transferBudget > 0));
  for (const buyer of buyers.slice(0, 40)) {
    if (!rng.chance(0.06)) continue;
    const needs = clubNeeds(ctx, buyer.id, leagueLines(ctx, buyer.leagueId)).filter((n) => n.priority >= 1.5);
    const wageRoom = buyer.wageBudget - weeklyWageBill(world, buyer.id);
    const targets = mine.filter((p) => {
      const need = needs.find((n) => n.pos === p.position);
      return need !== undefined && overall(p) >= need.minRating && p.value * 0.9 <= buyer.transferBudget && wageDemand(p, isRealWorld(world)) * 1.1 <= wageRoom;
    });
    if (targets.length === 0) continue;
    const p = targets.sort((a, b) => overall(b) - overall(a) || a.id.localeCompare(b.id))[Math.min(targets.length - 1, rng.int(0, 1))];
    const asking = p.listedAt ?? p.value * rng.float(1.05, 1.6);
    const fee = Math.round(Math.min(buyer.transferBudget, asking));
    const bid: TransferBid = { id: nextId(world, 'b', 4), day: world.day, playerId: p.id, fromClubId: humanId, toClubId: buyer.id, fee, expiresDay: world.day + BID_DAYS };
    ctx.emit('BID_RECEIVED', { bid });
    return;
  }
}

export function expireBids(ctx: Ctx): void {
  const { world } = ctx;
  for (const bid of [...world.pendingBids]) {
    const lapsed = bid.expiresDay <= world.day || !inTransferWindow(world);
    if (!lapsed) continue;
    ctx.emit('BID_RESOLVED', { bidId: bid.id, accepted: false });
    const p = world.players[bid.playerId];
    publish(ctx, [{ category: 'bid', headline: `${world.clubs[bid.toClubId].name} withdraw ${p.name} bid`, body: `${world.clubs[bid.toClubId].name} have pulled their offer for ${p.name} after receiving no answer.`, clubIds: [bid.toClubId, bid.fromClubId], playerId: p.id }]);
  }
}

function record(ctx: Ctx, playerId: string, fromClubId: string, toClubId: string, fee: number): TransferRecord {
  return { id: nextId(ctx.world, 't'), season: ctx.world.season, day: ctx.world.day, playerId, fromClubId, toClubId, fee, kind: 'transfer' };
}

export interface BidResult { ok: boolean; message: string }

/** Accept or reject a pending bid for one of the human club's players. */
export function respondToBid(ctx: Ctx, bidId: string, accept: boolean): BidResult {
  const { world, rng } = ctx;
  const bid = world.pendingBids.find((b) => b.id === bidId);
  if (!bid) return { ok: false, message: 'That offer is no longer on the table.' };
  const p = world.players[bid.playerId];
  const buyer = world.clubs[bid.toClubId];
  const seller = world.clubs[bid.fromClubId];
  if (!accept) {
    ctx.emit('BID_RESOLVED', { bidId, accepted: false });
    const unhappy = buyer.reputation > seller.reputation + 5 && rng.chance(0.6);
    if (unhappy) ctx.emit('MORALE_CHANGED', { deltas: { [p.id]: -8 }, reason: 'rejected bid' });
    publish(ctx, [{ category: 'bid', headline: `${seller.name} reject ${buyer.name}'s bid for ${p.name}`, body: `${seller.name} have turned down the offer.${unhappy ? ` ${p.name} is said to be unsettled by the decision.` : ''}`, clubIds: [seller.id, buyer.id], playerId: p.id }]);
    return { ok: true, message: `Bid rejected.${unhappy ? ` ${p.name} is unhappy about it.` : ''}` };
  }
  const same = squad(world, seller.id).filter((x) => x.position === p.position && x.id !== p.id).length;
  if (same < MIN_PER_POSITION[p.position]) return { ok: false, message: `Selling would leave you short of ${p.position}s.` };
  const wage = Math.round(Math.max(contractOf(world, p.id)?.wage ?? 0, wageDemand(p, isRealWorld(world))) * 1.1 * 10) / 10;
  if (bid.fee > buyer.transferBudget + 1) {
    ctx.emit('BID_RESOLVED', { bidId, accepted: false });
    return { ok: false, message: `${buyer.name} can no longer afford the fee and have withdrawn.` };
  }
  const contract = makeContract(ctx, p.id, buyer.id, wage, contractLengthFor(p.age, rng));
  ctx.emit('PLAYER_TRANSFERRED', { record: record(ctx, p.id, seller.id, buyer.id, bid.fee), contract });
  ctx.emit('BID_RESOLVED', { bidId, accepted: true });
  return { ok: true, message: `${p.name} sold to ${buyer.name} for ${bid.fee}k.` };
}

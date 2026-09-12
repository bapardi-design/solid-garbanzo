/** Player morale and club board expectations. */
import type { Ctx } from '../core/context.js';
import type { Fixture } from '../core/schema.js';
import { contractOf, squad } from '../core/schema.js';

export function postMatchMorale(ctx: Ctx, fixture: Fixture): void {
  const { world } = ctx;
  const r = fixture.report;
  if (!r) return;
  const deltas: Record<string, number> = {};
  const apply = (clubId: string, xi: string[], won: boolean, drew: boolean) => {
    const starters = new Set(xi);
    for (const p of squad(world, clubId)) {
      const started = starters.has(p.id);
      let d = won ? (started ? 4 : 1) : drew ? 0 : started ? -3 : -1;
      if (drew && !started) d = -1;
      if (d !== 0) deltas[p.id] = d;
    }
  };
  const homeWon = fixture.winnerId === fixture.homeClubId;
  const awayWon = fixture.winnerId === fixture.awayClubId;
  const drew = fixture.winnerId === null;
  apply(fixture.homeClubId, r.homeXI, homeWon, drew);
  apply(fixture.awayClubId, r.awayXI, awayWon, drew);
  if (Object.keys(deltas).length) ctx.emit('MORALE_CHANGED', { deltas, reason: `result ${fixture.id}` });
}

/** How long a player is left out before he takes it personally. */
export const FROZEN_OUT_DAYS = 28;
/** How long a promise of football buys. */
export const PROMISE_DAYS = 28;

export type ConcernKind = 'frozen_out' | 'contract' | 'promise_due' | 'unsettled';

export interface Concern {
  playerId: string;
  kind: ConcernKind;
  /** What he is unhappy about, in his own terms. */
  note: string;
  /** Days until a promise falls due; null when none is outstanding. */
  promiseDaysLeft: number | null;
}

/**
 * What the dressing room is unhappy about. The engine has always known —
 * morale moves on being frozen out and on a contract running down — but a
 * manager was shown a number and no reason, and had nothing to say back.
 */
export function squadConcerns(world: Ctx['world'], clubId: string): Concern[] {
  const out: Concern[] = [];
  for (const p of squad(world, clubId)) {
    if (p.retired || p.loan) continue;
    // Never having started is the strongest form of being left out, not the
    // weakest: a day of -1 must not read as "started today".
    const neverStarted = p.lastStartDay < 0;
    const frozenFor = neverStarted ? Infinity : world.day - p.lastStartDay;
    const c = contractOf(world, p.id);
    const running = c !== null && c.endSeason === world.season && p.age < 31;
    if (p.promisedGamesBy !== null) {
      const left = p.promisedGamesBy - world.day;
      out.push({ playerId: p.id, kind: 'promise_due', promiseDaysLeft: left,
        note: left > 0 ? `Waiting on the game he was promised — ${left} day${left === 1 ? '' : 's'} left.` : 'The football he was promised never came.' });
      continue;
    }
    if (p.morale >= 40) continue;
    if (frozenFor > FROZEN_OUT_DAYS && p.injuryDays === 0) {
      out.push({ playerId: p.id, kind: 'frozen_out', promiseDaysLeft: null,
        note: neverStarted ? 'Has yet to start a match for the club.' : `Has not started in ${frozenFor} days and wants to know why.` });
    } else if (running) {
      out.push({ playerId: p.id, kind: 'contract', promiseDaysLeft: null,
        note: 'His deal is up at the end of the season and nobody has spoken to him.' });
    } else {
      out.push({ playerId: p.id, kind: 'unsettled', promiseDaysLeft: null, note: 'Unsettled, and not saying why.' });
    }
  }
  return out.sort((a, b) => world.players[a.playerId].morale - world.players[b.playerId].morale);
}

/**
 * Settles promises: kept when he starts a match inside the window, broken when
 * the day passes without one. Breaking one costs more than making it gained,
 * so promising football you cannot give is worse than saying nothing.
 */
export function settlePromises(ctx: Ctx): void {
  const { world } = ctx;
  const deltas: Record<string, number> = {};
  const cleared: string[] = [];
  for (const id in world.players) {
    const p = world.players[id];
    if (p.promisedGamesBy === null) continue;
    const started = p.lastStartDay >= 0 && p.lastStartDay > p.promisedGamesBy - PROMISE_DAYS;
    if (started) { deltas[id] = 6; cleared.push(id); }
    else if (world.day >= p.promisedGamesBy) { deltas[id] = -12; cleared.push(id); }
  }
  if (cleared.length) ctx.emit('PROMISES_SETTLED', { playerIds: cleared, deltas });
}

export function weeklyMorale(ctx: Ctx): void {
  const { world } = ctx;
  const deltas: Record<string, number> = {};
  for (const club of Object.values(world.clubs)) {
    for (const p of squad(world, club.id)) {
      let d = 0;
      // Drift back toward neutral.
      if (p.morale > 52) d -= 1;
      else if (p.morale < 48) d += 1;
      // Frozen out of the team.
      if (p.lastStartDay >= 0 && world.day - p.lastStartDay > FROZEN_OUT_DAYS && p.injuryDays === 0) d -= 2;
      // Contract running down without a renewal.
      const c = contractOf(world, p.id);
      if (c && c.endSeason === world.season && p.age < 31) d -= 1;
      if (d !== 0) deltas[p.id] = d;
    }
  }
  if (Object.keys(deltas).length) ctx.emit('MORALE_CHANGED', { deltas, reason: 'weekly' });
}

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
      if (p.lastStartDay >= 0 && world.day - p.lastStartDay > 28 && p.injuryDays === 0) d -= 2;
      // Contract running down without a renewal.
      const c = contractOf(world, p.id);
      if (c && c.endSeason === world.season && p.age < 31) d -= 1;
      if (d !== 0) deltas[p.id] = d;
    }
  }
  if (Object.keys(deltas).length) ctx.emit('MORALE_CHANGED', { deltas, reason: 'weekly' });
}

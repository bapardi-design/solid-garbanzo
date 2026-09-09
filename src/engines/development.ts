/** Player growth, decline, and valuation. */
import type { Ctx } from '../core/context.js';
import { clamp, round1 } from '../core/rng.js';
import { ATTRIBUTE_KEYS, seasonDay, squad, type Attributes } from '../core/schema.js';
import { overall, playerValue } from '../rating.js';

export function weeklyDevelopment(ctx: Ctx): void {
  const { world, rng } = ctx;
  const deltas: Record<string, Partial<Attributes>> = {};
  const weeksElapsed = Math.max(1, Math.floor(seasonDay(world) / 7));
  for (const club of Object.values(world.clubs)) {
    const manager = club.managerId ? world.managers[club.managerId] : null;
    const coaching = 0.8 + (manager ? manager.ability : 40) / 250;
    for (const p of squad(world, club.id)) {
      const ovr = overall(p);
      const d: Partial<Attributes> = {};
      if (p.age <= 23) {
        const room = Math.max(0, p.potential - ovr);
        if (room <= 0) continue;
        const minutesShare = clamp(p.stats.minutes / (weeksElapsed * 90), 0, 1);
        const growth = room * 0.022 * (0.55 + 0.7 * minutesShare) * coaching * rng.float(0.6, 1.4);
        const keys = p.position === 'GK' ? ATTRIBUTE_KEYS : ATTRIBUTE_KEYS.filter((k) => k !== 'goalkeeping');
        for (const k of keys) d[k] = round1(growth * rng.float(0.5, 1.5));
      } else if (p.age >= 30) {
        const decline = 0.05 * (p.age - 29) * rng.float(0.5, 1.5);
        d.pace = -round1(decline * 1.4);
        d.physical = -round1(decline);
        d.mental = round1(decline * 0.3);
      } else {
        continue;
      }
      if (Object.values(d).some((v) => v !== 0)) deltas[p.id] = d;
    }
  }
  if (Object.keys(deltas).length) ctx.emit('PLAYER_DEVELOPED', { deltas });
}

export function revalue(ctx: Ctx): void {
  const { world } = ctx;
  const values: Record<string, number> = {};
  for (const id in world.players) {
    const p = world.players[id];
    if (p.retired) continue;
    const v = playerValue(p);
    if (v !== p.value) values[id] = v;
  }
  if (Object.keys(values).length) ctx.emit('PLAYER_VALUED', { values });
}

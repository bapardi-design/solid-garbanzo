/** Player growth, decline, and valuation. */
import type { Ctx } from '../core/context.js';
import { clamp, round1 } from '../core/rng.js';
import { ATTRIBUTE_KEYS, isRealWorld, seasonDay, squad, type Attributes, type TrainingFocus } from '../core/schema.js';
import { overall, playerValue } from '../rating.js';

/**
 * What each focus is worth, as a multiplier on how fast an attribute grows.
 * Every one of them costs something: working on the ball means less work on
 * the body, and a week spent on fitness is a week not spent improving.
 */
const FOCUS: Record<TrainingFocus, { pace: number; technique: number; physical: number; mental: number; goalkeeping: number; young: number }> = {
  balanced:  { pace: 1, technique: 1, physical: 1, mental: 1, goalkeeping: 1, young: 1 },
  fitness:   { pace: 1.15, technique: 0.7, physical: 1.3, mental: 0.7, goalkeeping: 0.8, young: 1 },
  attacking: { pace: 1.35, technique: 1.35, physical: 0.7, mental: 0.75, goalkeeping: 0.8, young: 1 },
  defending: { pace: 0.75, technique: 0.7, physical: 1.35, mental: 1.35, goalkeeping: 1.3, young: 1 },
  youth:     { pace: 1, technique: 1, physical: 1, mental: 1, goalkeeping: 1, young: 1.45 },
};

export function weeklyDevelopment(ctx: Ctx): void {
  const { world, rng } = ctx;
  const deltas: Record<string, Partial<Attributes>> = {};
  const weeksElapsed = Math.max(1, Math.floor(seasonDay(world) / 7));
  for (const club of Object.values(world.clubs)) {
    const manager = club.managerId ? world.managers[club.managerId] : null;
    const coaching = 0.8 + (manager ? manager.ability : 40) / 250;
    // Only the human's squad trains to order; the rest work on everything.
    const focus = FOCUS[club.id === world.humanClubId ? world.training : 'balanced'];
    for (const p of squad(world, club.id)) {
      const ovr = overall(p);
      const d: Partial<Attributes> = {};
      if (p.age <= 23) {
        const room = Math.max(0, p.potential - ovr);
        if (room <= 0) continue;
        const minutesShare = clamp(p.stats.minutes / (weeksElapsed * 90), 0, 1);
        const growth = room * 0.022 * (0.55 + 0.7 * minutesShare) * coaching * focus.young * rng.float(0.6, 1.4);
        const keys = p.position === 'GK' ? ATTRIBUTE_KEYS : ATTRIBUTE_KEYS.filter((k) => k !== 'goalkeeping');
        for (const k of keys) d[k] = round1(growth * focus[k] * rng.float(0.5, 1.5));
      } else if (p.age >= 30) {
        const decline = 0.05 * (p.age - 29) * rng.float(0.5, 1.5);
        d.pace = -round1(decline * 1.4);
        d.physical = -round1(decline * (focus.physical > 1 ? 0.7 : 1));
        d.mental = round1(decline * 0.3);
      } else if (focus !== FOCUS.balanced) {
        // Between growing and declining a player still sharpens whatever the
        // week is spent on, slowly.
        const keys = p.position === 'GK' ? ATTRIBUTE_KEYS : ATTRIBUTE_KEYS.filter((k) => k !== 'goalkeeping');
        for (const k of keys) if (focus[k] > 1.2) d[k] = round1(0.06 * coaching * rng.float(0.4, 1.2));
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
  const real = isRealWorld(world);
  for (const id in world.players) {
    const p = world.players[id];
    if (p.retired) continue;
    const v = playerValue(p, real);
    if (v !== p.value) values[id] = v;
  }
  if (Object.keys(values).length) ctx.emit('PLAYER_VALUED', { values });
}

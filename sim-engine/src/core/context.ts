import type { Event, EventPayloads, EventType } from './events.js';
import { makeEvent } from './events.js';
import { reduce } from './reducer.js';
import type { Rng } from './rng.js';
import type { World } from './schema.js';

/** Shared handle passed to every engine: read the world, roll dice, emit events. */
export interface Ctx {
  world: World;
  rng: Rng;
  /** Applies the event to the world immediately and appends it to the log. */
  emit<T extends EventType>(type: T, payload: EventPayloads[T]): Event<T>;
  log: Event[];
}

export function createCtx(world: World, rng: Rng): Ctx {
  const log: Event[] = [];
  const ctx: Ctx = {
    world,
    rng,
    log,
    emit(type, payload) {
      // Clone so the logged event never aliases live world objects.
      const e = makeEvent(type, world.day, structuredClone(payload));
      reduce(world, e);
      log.push(e);
      return e;
    },
  };
  return ctx;
}

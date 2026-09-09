/** Deterministic serialisation and hashing of world state. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { World } from '../core/schema.js';
import type { RngState } from '../core/rng.js';

export interface Snapshot { version: 1; world: World; rng: RngState }

export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}

export function hashWorld(world: World): string {
  return createHash('sha256').update(stableStringify(world)).digest('hex');
}

export function saveSnapshot(dir: string, world: World, rng: RngState, label: string): string {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `world_${label}.json`);
  const snapshot: Snapshot = { version: 1, world, rng };
  writeFileSync(file, stableStringify(snapshot));
  return file;
}

export function loadSnapshot(file: string): Snapshot {
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<Snapshot>;
  if (parsed.version !== 1 || !parsed.world || !parsed.rng) throw new Error(`${file} is not a version 1 snapshot`);
  return parsed as Snapshot;
}

/** Deep copy suitable for keeping a snapshot in memory. */
export function cloneWorld(world: World): World {
  return structuredClone(world);
}

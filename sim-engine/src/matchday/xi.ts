/** Starting XI selection from the available squad for a tactic's formation. */
import type { Player, Position, Tactic, World } from '../core/schema.js';
import { squad } from '../core/schema.js';
import { effectiveRating } from '../rating.js';

export interface Formation { name: string; slots: Record<Position, number> }

export const FORMATIONS: Record<Tactic, Formation> = {
  balanced: { name: '4-4-2', slots: { GK: 1, DF: 4, MF: 4, FW: 2 } },
  attacking: { name: '4-3-3', slots: { GK: 1, DF: 4, MF: 3, FW: 3 } },
  defensive: { name: '5-4-1', slots: { GK: 1, DF: 5, MF: 4, FW: 1 } },
};

export interface Selection {
  formation: string;
  playerIds: string[];
  byPos: Record<Position, { playerId: string; rating: number }[]>;
}

/** Fit, not banned, and still on the books. */
export function availablePlayers(world: World, clubId: string): Player[] {
  return squad(world, clubId).filter((p) => !p.retired && p.injuryDays === 0 && p.suspension === 0);
}

export function selectXI(world: World, clubId: string, tactic: Tactic): Selection {
  const formation = FORMATIONS[tactic];
  const pool = availablePlayers(world, clubId);
  const taken = new Set<string>();
  const byPos: Selection['byPos'] = { GK: [], DF: [], MF: [], FW: [] };

  // First pass: natural positions, best effective rating.
  for (const pos of ['GK', 'DF', 'MF', 'FW'] as const) {
    const candidates = pool
      .filter((p) => p.position === pos && !taken.has(p.id))
      .map((p) => ({ playerId: p.id, rating: effectiveRating(p, pos) }))
      .sort((a, b) => b.rating - a.rating || a.playerId.localeCompare(b.playerId));
    for (const c of candidates.slice(0, formation.slots[pos])) {
      byPos[pos].push(c);
      taken.add(c.playerId);
    }
  }
  // Second pass: fill vacancies out of position.
  for (const pos of ['GK', 'DF', 'MF', 'FW'] as const) {
    while (byPos[pos].length < formation.slots[pos]) {
      const candidates = pool
        .filter((p) => !taken.has(p.id))
        .map((p) => ({ playerId: p.id, rating: effectiveRating(p, pos) }))
        .sort((a, b) => b.rating - a.rating || a.playerId.localeCompare(b.playerId));
      if (candidates.length === 0) break;
      byPos[pos].push(candidates[0]);
      taken.add(candidates[0].playerId);
    }
  }
  return { formation: formation.name, playerIds: [...taken], byPos };
}

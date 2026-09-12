import { clamp } from './core/rng.js';
import type { Attributes, Player, Position, World } from './core/schema.js';
import { squad } from './core/schema.js';

const WEIGHTS: Record<Position, Attributes> = {
  GK: { pace: 0.05, technique: 0.10, physical: 0.15, mental: 0.20, goalkeeping: 0.50 },
  DF: { pace: 0.20, technique: 0.20, physical: 0.30, mental: 0.30, goalkeeping: 0 },
  MF: { pace: 0.20, technique: 0.35, physical: 0.20, mental: 0.25, goalkeeping: 0 },
  FW: { pace: 0.30, technique: 0.35, physical: 0.20, mental: 0.15, goalkeeping: 0 },
};

/** Position-weighted overall rating (1-99). */
export function overall(p: Player, pos: Position = p.position): number {
  const w = WEIGHTS[pos];
  const a = p.attrs;
  return a.pace * w.pace + a.technique * w.technique + a.physical * w.physical + a.mental * w.mental + a.goalkeeping * w.goalkeeping;
}

/** Overall adjusted for fitness and form; used for selection and match strength. */
export function effectiveRating(p: Player, pos: Position = p.position): number {
  const base = overall(p, pos);
  const fitnessFactor = 0.75 + 0.25 * (p.fitness / 100);
  const formFactor = 0.95 + 0.10 * (p.form / 100);
  const outOfPosition = pos === p.position ? 1 : (pos === 'GK' || p.position === 'GK') ? 0.55 : 0.88;
  return base * fitnessFactor * formFactor * outOfPosition;
}

export function ageFactor(age: number): number {
  if (age <= 20) return 0.75 + (age - 16) * 0.06;
  if (age <= 28) return 1.0;
  if (age <= 31) return 1.0 - (age - 28) * 0.12;
  return Math.max(0.15, 0.64 - (age - 31) * 0.14);
}

/**
 * Market value in k. The real-world model is steeply convex: a 90-rated star is
 * worth about a hundred million while a lower-league regular is worth a few
 * hundred thousand. The custom model is the gentler cubic the calibration
 * tests were tuned against.
 */
export function playerValue(p: Player, real = false): number {
  const ovr = overall(p);
  if (real) {
    const base = Math.pow(ovr / 100, 8) * 230000;
    const potentialBonus = p.age < 24 ? Math.max(0, p.potential - ovr) * Math.pow(ovr / 100, 5) * 2500 : 0;
    return Math.max(50, Math.round((base + potentialBonus) * ageFactor(p.age)));
  }
  const base = Math.pow(ovr / 100, 3) * 24000;
  const potentialBonus = p.age < 24 ? Math.max(0, p.potential - ovr) * 120 : 0;
  return Math.max(25, Math.round((base + potentialBonus) * ageFactor(p.age)));
}

/** Weekly wage a player expects, in k. */
export function wageDemand(p: Player, real = false): number {
  if (real) return Math.max(0.5, Math.round(playerValue(p, true) * 0.004 * 10) / 10);
  const ovr = overall(p);
  return Math.max(1, Math.round(Math.pow(ovr / 100, 2.5) * 55 * (0.8 + 0.2 * ageFactor(p.age))));
}

/**
 * A loan splits the wage. The club he plays for pays this much of it and the
 * club that owns him pays the rest, which is what makes a loan worth taking:
 * charged the lot, no club below the top flight could afford anybody's
 * reserves and the loan market never opened at all.
 */
export const LOAN_WAGE_SHARE = 0.35;

export function weeklyWageBill(world: World, clubId: string): number {
  let total = 0;
  for (const p of squad(world, clubId)) {
    const c = p.contractId ? world.contracts[p.contractId] : null;
    if (c) total += p.loan ? c.wage * LOAN_WAGE_SHARE : c.wage;
  }
  for (const id of world.idx.loanedOutBy[clubId] ?? []) {
    const c = world.players[id]?.contractId;
    if (c) total += world.contracts[c].wage * (1 - LOAN_WAGE_SHARE);
  }
  return total;
}

/** Mean effective rating of the best `n` players at a position. */
export function lineStrength(players: Player[], pos: Position, n: number): number {
  const rated = players.map((p) => effectiveRating(p, pos)).sort((a, b) => b - a);
  if (rated.length === 0) return 30;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += rated[Math.min(i, rated.length - 1)];
  return sum / n;
}

/** Rough club strength from the best XI in a 4-4-2. */
export function squadStrength(world: World, clubId: string): number {
  const players = squad(world, clubId).filter((p) => !p.retired);
  const byPos = (pos: Position) => players.filter((p) => p.position === pos);
  return clamp(
    (lineStrength(byPos('GK'), 'GK', 1) * 1 +
      lineStrength(byPos('DF'), 'DF', 4) * 4 +
      lineStrength(byPos('MF'), 'MF', 4) * 4 +
      lineStrength(byPos('FW'), 'FW', 2) * 2) / 11,
    1, 99,
  );
}

export function averageRating(p: Player): number {
  return p.stats.apps > 0 ? p.stats.ratingSum / p.stats.apps : 0;
}

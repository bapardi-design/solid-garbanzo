/**
 * Match engine. Expected goals for each side are built from a base rate and a
 * list of named multiplicative factors, so every result can be explained.
 * Goals are drawn from a Poisson distribution; scorers are weighted by
 * position and rating.
 */
import type { Ctx } from '../core/context.js';
import type { PlayerMatchStats } from '../core/events.js';
import { clamp } from '../core/rng.js';
import type { Fixture, GoalEvent, GoalFactor, HalfTimeState, MatchReport, Player, Position, Tactic, World } from '../core/schema.js';
import { effectiveRating } from '../rating.js';
import { FORMATIONS, selectXI, type Selection } from './xi.js';

/** Calibrated for roughly 2.6-2.8 goals per game, ~45% home wins, ~26% draws. */
export const BASE_HOME_XG = 1.43;
export const BASE_AWAY_XG = 1.12;
const STRENGTH_EXPONENT = 1.7;
const MIN_XG = 0.25;
const MAX_XG = 4.5;
const INJURY_CHANCE = 0.012;

export interface TeamLines { gk: number; def: number; mid: number; att: number; morale: number; }

export function teamLines(world: World, sel: Selection): TeamLines {
  const mean = (arr: { rating: number }[]) => (arr.length ? arr.reduce((s, x) => s + x.rating, 0) / arr.length : 30);
  const moraleMean = sel.playerIds.reduce((s, id) => s + world.players[id].morale, 0) / Math.max(1, sel.playerIds.length);
  return { gk: mean(sel.byPos.GK), def: mean(sel.byPos.DF), mid: mean(sel.byPos.MF), att: mean(sel.byPos.FW), morale: moraleMean };
}

const TACTIC_ATTACK: Record<Tactic, number> = { balanced: 1.0, attacking: 1.12, defensive: 0.88 };
const TACTIC_DEFENCE: Record<Tactic, number> = { balanced: 1.0, attacking: 1.12, defensive: 0.86 };

export interface SideInput {
  clubId: string;
  lines: TeamLines;
  tactic: Tactic;
  managerAbility: number;
  form: number;
  home: boolean;
}

/** Expected goals for `us` against `them`, with the factor breakdown. */
export function expectedGoals(us: SideInput, them: SideInput): { lambda: number; factors: GoalFactor[] } {
  const factors: GoalFactor[] = [];
  const base = us.home ? BASE_HOME_XG : BASE_AWAY_XG;
  factors.push({ name: 'base', multiplier: base, note: us.home ? 'home base rate' : 'away base rate' });

  const attack = us.lines.att * 0.55 + us.lines.mid * 0.45;
  const defence = them.lines.def * 0.55 + them.lines.gk * 0.25 + them.lines.mid * 0.20;
  const ratio = Math.pow(attack / defence, STRENGTH_EXPONENT);
  factors.push({ name: 'strength', multiplier: ratio, note: `attack ${attack.toFixed(1)} vs defence ${defence.toFixed(1)}` });

  const tactic = TACTIC_ATTACK[us.tactic] * TACTIC_DEFENCE[them.tactic];
  factors.push({ name: 'tactics', multiplier: tactic, note: `${us.tactic} vs ${them.tactic}` });

  const morale = 1 + ((us.lines.morale - 50) / 50) * 0.08;
  factors.push({ name: 'morale', multiplier: morale, note: `squad morale ${us.lines.morale.toFixed(0)}` });

  const manager = 1 + ((us.managerAbility - them.managerAbility) / 100) * 0.10;
  factors.push({ name: 'manager', multiplier: manager, note: `ability ${us.managerAbility} vs ${them.managerAbility}` });

  const form = 1 + ((us.form - 1.4) / 3) * 0.05;
  factors.push({ name: 'form', multiplier: form, note: `${us.form.toFixed(2)} pts/game recently` });

  let lambda = 1;
  for (const f of factors) lambda *= f.multiplier;
  return { lambda: clamp(lambda, MIN_XG, MAX_XG), factors };
}

const SCORER_WEIGHT: Record<Position, number> = { GK: 0.01, DF: 0.12, MF: 0.32, FW: 0.55 };

function pickScorer(ctx: Ctx, sel: Selection): { scorerId: string; assistId: string | null } {
  const { world, rng } = ctx;
  const ids = sel.playerIds;
  const weights = ids.map((id) => {
    const p = world.players[id];
    const slot = (Object.keys(sel.byPos) as Position[]).find((pos) => sel.byPos[pos].some((x) => x.playerId === id)) ?? p.position;
    return SCORER_WEIGHT[slot] * Math.pow(effectiveRating(p, slot) / 60, 2);
  });
  const scorerId = rng.weighted(ids, weights);
  let assistId: string | null = null;
  if (rng.chance(0.72)) {
    const others = ids.filter((id) => id !== scorerId);
    const w2 = others.map((id) => (world.players[id].position === 'GK' ? 0.02 : 1));
    assistId = rng.weighted(others, w2);
  }
  return { scorerId, assistId };
}

function clubForm(world: World, clubId: string): number {
  const f = world.clubs[clubId].form;
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : 1.4;
}

function managerAbility(world: World, clubId: string): number {
  const mid = world.clubs[clubId].managerId;
  return mid ? world.managers[mid].ability : 40;
}

export function attendanceFor(world: World, fixture: Fixture): number {
  const home = world.clubs[fixture.homeClubId];
  const away = world.clubs[fixture.awayClubId];
  const interest = 0.45 + home.reputation / 200 + away.reputation / 500 + (clubForm(world, home.id) - 1.4) * 0.05;
  return Math.round(home.stadiumCapacity * clamp(interest, 0.25, 1));
}

export interface MatchOutcome {
  homeGoals: number;
  awayGoals: number;
  winnerId: string | null;
  report: MatchReport;
  playerStats: Record<string, PlayerMatchStats>;
  injuries: { playerId: string; days: number }[];
}

/** What the human asks for at half time. Invalid entries are ignored. */
export interface HalfTimeDecision {
  tactic?: Tactic;
  subs?: { offId: string; onId: string }[];
}

export const MAX_SUBS = 3;

function sideInput(world: World, clubId: string, sel: Selection, tactic: Tactic, home: boolean): SideInput {
  return { clubId, lines: teamLines(world, sel), tactic, managerAbility: managerAbility(world, clubId), form: clubForm(world, clubId), home };
}

/** Position slot a player occupies in a selection. */
function slotOf(sel: Selection, playerId: string): Position | null {
  for (const pos of ['GK', 'DF', 'MF', 'FW'] as const) {
    if (sel.byPos[pos].some((x) => x.playerId === playerId)) return pos;
  }
  return null;
}

/** Applies up to MAX_SUBS like-for-like swaps, skipping any that are not legal. */
export function applySubs(world: World, sel: Selection, subs: { offId: string; onId: string }[]): { sel: Selection; applied: { offId: string; onId: string }[] } {
  const byPos: Selection['byPos'] = { GK: [...sel.byPos.GK], DF: [...sel.byPos.DF], MF: [...sel.byPos.MF], FW: [...sel.byPos.FW] };
  const next: Selection = { formation: sel.formation, playerIds: [...sel.playerIds], byPos };
  const applied: { offId: string; onId: string }[] = [];
  for (const { offId, onId } of subs) {
    if (applied.length >= MAX_SUBS) break;
    const on = world.players[onId];
    if (!on || on.retired || on.injuryDays > 0) continue;
    if (next.playerIds.includes(onId)) continue;
    const pos = slotOf(next, offId);
    if (!pos) continue;
    const i = byPos[pos].findIndex((x) => x.playerId === offId);
    byPos[pos][i] = { playerId: onId, rating: effectiveRating(on, pos) };
    next.playerIds[next.playerIds.indexOf(offId)] = onId;
    applied.push({ offId, onId });
  }
  return { sel: next, applied };
}

/** Goals scored in one half by one side: a Poisson draw on half the match rate. */
function halfGoals(ctx: Ctx, lambda: number, count: number, sel: Selection, clubId: string, from: number, to: number): GoalEvent[] {
  void lambda;
  const out: GoalEvent[] = [];
  for (let i = 0; i < count; i++) out.push({ minute: ctx.rng.int(from, to), clubId, ...pickScorer(ctx, sel) });
  return out;
}

interface Settlement {
  fixture: Fixture;
  homeSel1: Selection; awaySel1: Selection;
  homeSel2: Selection; awaySel2: Selection;
  goals: GoalEvent[];
  htScore: { home: number; away: number };
  xgHome: { lambda: number; factors: GoalFactor[] };
  xgAway: { lambda: number; factors: GoalFactor[] };
  second: MatchReport['second'];
  subs: MatchReport['subs'];
  tacticChange: MatchReport['tacticChange'];
  attendance: number;
}

/** Penalties, player stats, injuries and the report, once both halves are played. */
function settle(ctx: Ctx, s: Settlement): MatchOutcome {
  const { world, rng } = ctx;
  const { fixture } = s;
  const homeGoals = s.goals.filter((g) => g.clubId === fixture.homeClubId).length;
  const awayGoals = s.goals.length - homeGoals;

  let winnerId: string | null = homeGoals > awayGoals ? fixture.homeClubId : awayGoals > homeGoals ? fixture.awayClubId : null;
  let penalties: MatchReport['penalties'] = null;
  if (fixture.knockout && winnerId === null) {
    let h = 0, a = 0;
    for (let i = 0; i < 5 || h === a; i++) {
      if (rng.chance(0.76)) h++;
      if (rng.chance(0.76)) a++;
      if (i > 20) { h++; break; }
    }
    penalties = { home: h, away: a };
    winnerId = h > a ? fixture.homeClubId : fixture.awayClubId;
  }

  const playerStats: Record<string, PlayerMatchStats> = {};
  const injuries: { playerId: string; days: number }[] = [];
  const tally = (first: Selection, second: Selection, goalsFor: number, goalsAgainst: number) => {
    const ids = [...new Set([...first.playerIds, ...second.playerIds])].sort();
    for (const id of ids) {
      const p: Player = world.players[id];
      const minutes = (first.playerIds.includes(id) ? 45 : 0) + (second.playerIds.includes(id) ? 45 : 0);
      const scored = s.goals.filter((g) => g.scorerId === id).length;
      const assisted = s.goals.filter((g) => g.assistId === id).length;
      let rating = 6.0 + scored * 1.0 + assisted * 0.5;
      if ((p.position === 'GK' || p.position === 'DF') && goalsAgainst === 0 && minutes === 90) rating += 0.6;
      rating -= goalsAgainst * 0.12;
      rating += (goalsFor - goalsAgainst) * 0.15;
      rating += rng.normal(0, 0.35);
      playerStats[id] = {
        minutes,
        goals: scored,
        assists: assisted,
        rating: clamp(Math.round(rating * 10) / 10, 3, 10),
        fitnessDelta: -(14 - p.attrs.physical / 20) * (minutes / 90),
      };
      if (rng.chance(INJURY_CHANCE * (minutes / 90))) injuries.push({ playerId: id, days: rng.int(3, 45) });
    }
  };
  tally(s.homeSel1, s.homeSel2, homeGoals, awayGoals);
  tally(s.awaySel1, s.awaySel2, awayGoals, homeGoals);

  const report: MatchReport = {
    homeXI: s.homeSel1.playerIds,
    awayXI: s.awaySel1.playerIds,
    homeFormation: s.homeSel1.formation,
    awayFormation: s.awaySel1.formation,
    lambda: { home: s.xgHome.lambda, away: s.xgAway.lambda },
    factors: { home: s.xgHome.factors, away: s.xgAway.factors },
    second: s.second,
    goals: s.goals,
    penalties,
    attendance: s.attendance,
    halfTimeScore: s.htScore,
    subs: s.subs,
    tacticChange: s.tacticChange,
  };
  return { homeGoals, awayGoals, winnerId, report, playerStats, injuries };
}

/** Plays the whole match in one pass: both halves on the same basis. */
export function simulateMatch(ctx: Ctx, fixture: Fixture): MatchOutcome {
  const { world, rng } = ctx;
  const homeClub = world.clubs[fixture.homeClubId];
  const awayClub = world.clubs[fixture.awayClubId];
  const homeSel = selectXI(world, homeClub.id, homeClub.tactic);
  const awaySel = selectXI(world, awayClub.id, awayClub.tactic);
  const homeSide = sideInput(world, homeClub.id, homeSel, homeClub.tactic, true);
  const awaySide = sideInput(world, awayClub.id, awaySel, awayClub.tactic, false);
  const xgHome = expectedGoals(homeSide, awaySide);
  const xgAway = expectedGoals(awaySide, homeSide);

  const goals: GoalEvent[] = [];
  let htHome = 0, htAway = 0;
  for (const [from, to] of [[1, 45], [46, 90]] as const) {
    const h = rng.poisson(xgHome.lambda / 2);
    const a = rng.poisson(xgAway.lambda / 2);
    goals.push(...halfGoals(ctx, xgHome.lambda, h, homeSel, homeClub.id, from, to));
    goals.push(...halfGoals(ctx, xgAway.lambda, a, awaySel, awayClub.id, from, to));
    if (from === 1) { htHome = h; htAway = a; }
  }
  goals.sort((a, b) => a.minute - b.minute || a.clubId.localeCompare(b.clubId));

  return settle(ctx, {
    fixture,
    homeSel1: homeSel, awaySel1: awaySel, homeSel2: homeSel, awaySel2: awaySel,
    goals,
    htScore: { home: htHome, away: htAway },
    xgHome, xgAway,
    second: null,
    subs: [],
    tacticChange: null,
    attendance: attendanceFor(world, fixture),
  });
}

/** Plays the first 45 minutes and returns the state to pause on. */
export function simulateFirstHalf(ctx: Ctx, fixture: Fixture, clubId: string): HalfTimeState {
  const { world, rng } = ctx;
  const homeClub = world.clubs[fixture.homeClubId];
  const awayClub = world.clubs[fixture.awayClubId];
  const homeSel = selectXI(world, homeClub.id, homeClub.tactic);
  const awaySel = selectXI(world, awayClub.id, awayClub.tactic);
  const homeSide = sideInput(world, homeClub.id, homeSel, homeClub.tactic, true);
  const awaySide = sideInput(world, awayClub.id, awaySel, awayClub.tactic, false);
  const xgHome = expectedGoals(homeSide, awaySide);
  const xgAway = expectedGoals(awaySide, homeSide);

  const h = rng.poisson(xgHome.lambda / 2);
  const a = rng.poisson(xgAway.lambda / 2);
  const goals = [
    ...halfGoals(ctx, xgHome.lambda, h, homeSel, homeClub.id, 1, 45),
    ...halfGoals(ctx, xgAway.lambda, a, awaySel, awayClub.id, 1, 45),
  ].sort((x, y) => x.minute - y.minute || x.clubId.localeCompare(y.clubId));

  return {
    fixtureId: fixture.id,
    clubId,
    homeXI: homeSel.playerIds,
    awayXI: awaySel.playerIds,
    homeFormation: homeSel.formation,
    awayFormation: awaySel.formation,
    homeTactic: homeClub.tactic,
    awayTactic: awayClub.tactic,
    lambda: { home: xgHome.lambda, away: xgAway.lambda },
    factors: { home: xgHome.factors, away: xgAway.factors },
    goals,
    homeGoals: h,
    awayGoals: a,
    attendance: attendanceFor(world, fixture),
    remainingFixtureIds: [],
  };
}

/**
 * Rebuilds a selection from stored ids so the second half continues the first.
 * Same rules as `selectXI`, with the pool restricted to the eleven who started,
 * which puts every player back in the slot they were picked for.
 */
export function selectionFromIds(world: World, ids: string[], formation: string, tactic: Tactic): Selection {
  const slots = FORMATIONS[tactic].slots;
  const pool = ids.map((id) => world.players[id]).filter(Boolean);
  const taken = new Set<string>();
  const byPos: Selection['byPos'] = { GK: [], DF: [], MF: [], FW: [] };
  const ranked = (candidates: Player[], pos: Position) => candidates
    .map((p) => ({ playerId: p.id, rating: effectiveRating(p, pos) }))
    .sort((a, b) => b.rating - a.rating || a.playerId.localeCompare(b.playerId));
  for (const pos of ['GK', 'DF', 'MF', 'FW'] as const) {
    for (const c of ranked(pool.filter((p) => p.position === pos && !taken.has(p.id)), pos).slice(0, slots[pos])) {
      byPos[pos].push(c);
      taken.add(c.playerId);
    }
  }
  for (const pos of ['GK', 'DF', 'MF', 'FW'] as const) {
    while (byPos[pos].length < slots[pos]) {
      const next = ranked(pool.filter((p) => !taken.has(p.id)), pos)[0];
      if (!next) break;
      byPos[pos].push(next);
      taken.add(next.playerId);
    }
  }
  return { formation, playerIds: [...ids], byPos };
}

/**
 * Plays the second half of a paused match. The human's tactic switch and
 * substitutions change the second-half basis; the opposition plays on.
 */
export function finishMatch(ctx: Ctx, ht: HalfTimeState, decision: HalfTimeDecision = {}): MatchOutcome {
  const { world, rng } = ctx;
  const fixture = world.fixtures[ht.fixtureId];
  const humanHome = ht.clubId === fixture.homeClubId;

  const homeSel1 = selectionFromIds(world, ht.homeXI, ht.homeFormation, ht.homeTactic);
  const awaySel1 = selectionFromIds(world, ht.awayXI, ht.awayFormation, ht.awayTactic);
  const mine1 = humanHome ? homeSel1 : awaySel1;
  const newTactic = decision.tactic ?? (humanHome ? ht.homeTactic : ht.awayTactic);
  const oldTactic = humanHome ? ht.homeTactic : ht.awayTactic;
  const { sel: mine2, applied } = applySubs(world, mine1, decision.subs ?? []);

  const homeSel2 = humanHome ? mine2 : homeSel1;
  const awaySel2 = humanHome ? awaySel1 : mine2;
  const homeTactic2 = humanHome ? newTactic : ht.homeTactic;
  const awayTactic2 = humanHome ? ht.awayTactic : newTactic;

  const homeSide2 = sideInput(world, fixture.homeClubId, homeSel2, homeTactic2, true);
  const awaySide2 = sideInput(world, fixture.awayClubId, awaySel2, awayTactic2, false);
  const xg2Home = expectedGoals(homeSide2, awaySide2);
  const xg2Away = expectedGoals(awaySide2, homeSide2);

  const h2 = rng.poisson(xg2Home.lambda / 2);
  const a2 = rng.poisson(xg2Away.lambda / 2);
  const goals = [
    ...ht.goals,
    ...halfGoals(ctx, xg2Home.lambda, h2, homeSel2, fixture.homeClubId, 46, 90),
    ...halfGoals(ctx, xg2Away.lambda, a2, awaySel2, fixture.awayClubId, 46, 90),
  ].sort((x, y) => x.minute - y.minute || x.clubId.localeCompare(y.clubId));

  const changed = newTactic !== oldTactic || applied.length > 0;
  return settle(ctx, {
    fixture,
    homeSel1, awaySel1, homeSel2, awaySel2,
    goals,
    htScore: { home: ht.homeGoals, away: ht.awayGoals },
    xgHome: { lambda: ht.lambda.home, factors: ht.factors.home },
    xgAway: { lambda: ht.lambda.away, factors: ht.factors.away },
    second: changed ? { lambda: { home: xg2Home.lambda, away: xg2Away.lambda }, factors: { home: xg2Home.factors, away: xg2Away.factors } } : null,
    subs: applied.map((x) => ({ clubId: ht.clubId, offId: x.offId, onId: x.onId, minute: 46 })),
    tacticChange: newTactic !== oldTactic ? { clubId: ht.clubId, from: oldTactic, to: newTactic } : null,
    attendance: ht.attendance,
  });
}

/** Human-readable explanation of a played fixture's expected goals. */
export function explainMatch(world: World, fixture: Fixture): string {
  const r = fixture.report;
  const h = world.clubs[fixture.homeClubId];
  const a = world.clubs[fixture.awayClubId];
  if (!r) return `${h.name} v ${a.name}: not played`;
  const lines: string[] = [];
  lines.push(`${h.name} ${fixture.homeGoals} - ${fixture.awayGoals} ${a.name}  (HT ${r.halfTimeScore.home}-${r.halfTimeScore.away}, day ${fixture.day}, ${r.homeFormation} v ${r.awayFormation}, att ${r.attendance})`);
  const side = (label: string, factors: GoalFactor[], lambda: number) => {
    lines.push(`  ${label} xG ${lambda.toFixed(2)}:`);
    for (const f of factors) lines.push(`    ${f.name.padEnd(9)} x${f.multiplier.toFixed(3)}  ${f.note}`);
  };
  side(h.short, r.factors.home, r.lambda.home);
  side(a.short, r.factors.away, r.lambda.away);
  if (r.second) {
    lines.push(`  second half after the change:`);
    side(h.short, r.second.factors.home, r.second.lambda.home);
    side(a.short, r.second.factors.away, r.second.lambda.away);
  }
  if (r.tacticChange) lines.push(`  HT ${world.clubs[r.tacticChange.clubId].short} ${r.tacticChange.from} -> ${r.tacticChange.to}`);
  for (const sub of r.subs) lines.push(`  ${sub.minute}' ${world.clubs[sub.clubId].short} ${world.players[sub.onId]?.name ?? sub.onId} for ${world.players[sub.offId]?.name ?? sub.offId}`);
  for (const g of r.goals) {
    const scorer = world.players[g.scorerId]?.name ?? g.scorerId;
    const assist = g.assistId ? ` (assist ${world.players[g.assistId]?.name ?? g.assistId})` : '';
    lines.push(`  ${String(g.minute).padStart(2)}' ${world.clubs[g.clubId].short} ${scorer}${assist}`);
  }
  if (r.penalties) lines.push(`  penalties ${r.penalties.home}-${r.penalties.away}`);
  return lines.join('\n');
}

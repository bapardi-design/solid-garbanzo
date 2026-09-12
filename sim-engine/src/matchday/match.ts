/**
 * Match engine. Expected goals for each side are built from a base rate and a
 * list of named multiplicative factors, so every result can be explained.
 * Goals are drawn from a Poisson distribution; scorers are weighted by
 * position and rating.
 */
import type { Ctx } from '../core/context.js';
import type { PlayerMatchStats } from '../core/events.js';
import { clamp } from '../core/rng.js';
import type { CardEvent, Fixture, GoalEvent, GoalFactor, HalfTimeState, MatchReport, Player, Position, Tactic, World } from '../core/schema.js';
import { effectiveRating } from '../rating.js';
import { attendanceFactor, medicalFactor, recoveryFactor } from '../engines/boardroom.js';
import { FORMATIONS, selectXI, type Selection } from './xi.js';

/** Calibrated for roughly 2.6-2.8 goals per game, ~45% home wins, ~26% draws. */
export const BASE_HOME_XG = 1.43;
export const BASE_AWAY_XG = 1.12;
const STRENGTH_EXPONENT = 1.7;
const MIN_XG = 0.25;
const MAX_XG = 4.5;
const INJURY_CHANCE = 0.012;
/** Bookings per side per match, near the real rate of about two. */
const YELLOW_RATE = 1.9;
/** Of all bookings, this share is a straight red. Real football sits near one in twenty matches. */
const RED_SHARE = 0.016;
/** A booked player is careful, and his manager is watching: he is far less likely to be the next one. */
const BOOKED_AGAIN = 0.10;
/** What a side is worth once it is down to ten. */
const TEN_MEN = 0.72;
const TEN_MEN_AGAINST = 1.14;
/** How likely each line is to be booked. */
const CARD_WEIGHT: Record<Position, number> = { GK: 0.25, DF: 1.35, MF: 1.5, FW: 0.9 };

/** Two clubs from the same city. */
export function isDerby(world: World, fixture: Fixture): boolean {
  const h = world.clubs[fixture.homeClubId], a = world.clubs[fixture.awayClubId];
  return Boolean(h && a && h.city && a.city && h.city === a.city);
}

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
  /** A meeting with the neighbours: the home ground counts for less. */
  derby?: boolean;
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

  if (us.derby) {
    const derby = us.home ? 0.96 : 1.07;
    factors.push({ name: 'derby', multiplier: derby, note: us.home ? 'the neighbours are not overawed' : 'nothing to lose at their place' });
  }

  let lambda = 1;
  for (const f of factors) lambda *= f.multiplier;
  return { lambda: clamp(lambda, MIN_XG, MAX_XG), factors };
}

const SCORER_WEIGHT: Record<Position, number> = { GK: 0.01, DF: 0.12, MF: 0.32, FW: 0.55 };

function pickScorer(ctx: Ctx, sel: Selection, off: Set<string> = new Set()): { scorerId: string; assistId: string | null } {
  const { world, rng } = ctx;
  const left = sel.playerIds.filter((id) => !off.has(id));
  const ids = left.length ? left : sel.playerIds;
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
  const derby = isDerby(world, fixture) ? 1.12 : 1;
  const interest = (0.45 + home.reputation / 200 + away.reputation / 500 + (clubForm(world, home.id) - 1.4) * 0.05) * attendanceFactor(world, home.id) * derby;
  return Math.round(home.stadiumCapacity * clamp(interest, 0.22, 1));
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

function sideInput(world: World, clubId: string, sel: Selection, tactic: Tactic, home: boolean, derby = false): SideInput {
  return { clubId, lines: teamLines(world, sel), tactic, managerAbility: managerAbility(world, clubId), form: clubForm(world, clubId), home, derby };
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
    if (!on || on.retired || on.injuryDays > 0 || on.suspension > 0) continue;
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

/**
 * Bookings for one side in one half. A second yellow for a player already
 * carrying one is a sending-off, as is a straight red; both earn a ban.
 */
function halfCards(ctx: Ctx, sel: Selection, clubId: string, from: number, to: number, booked: Set<string>, sentOff: Set<string>, derby: boolean): CardEvent[] {
  const { world, rng } = ctx;
  const out: CardEvent[] = [];
  const n = rng.poisson((YELLOW_RATE / 2) * (derby ? 1.35 : 1));
  // Minutes in order, so a player sent off cannot be booked later in the half.
  const minutes = Array.from({ length: n }, () => rng.int(from, to)).sort((a, b) => a - b);
  for (const minute of minutes) {
    // Anyone already off cannot be booked again.
    const ids = sel.playerIds.filter((id) => !sentOff.has(id));
    if (ids.length === 0) break;
    const weights = ids.map((id) => CARD_WEIGHT[world.players[id]?.position ?? 'MF'] * (booked.has(id) ? BOOKED_AGAIN : 1));
    const playerId = rng.weighted(ids, weights);
    if (booked.has(playerId)) {
      out.push({ minute, clubId, playerId, kind: 'second', ban: 1 });
      booked.delete(playerId);
      sentOff.add(playerId);
    } else if (rng.chance(RED_SHARE)) {
      out.push({ minute, clubId, playerId, kind: 'red', ban: rng.int(2, 3) });
      sentOff.add(playerId);
    } else {
      out.push({ minute, clubId, playerId, kind: 'yellow', ban: 0 });
      booked.add(playerId);
    }
  }
  return out.sort((a, b) => a.minute - b.minute);
}

/** What a side's attack is worth over a half, given anyone sent off. */
function manpower(cards: CardEvent[], clubId: string, from: number, to: number): { mine: number; theirs: number } {
  const span = to - from + 1;
  let mine = 1, theirs = 1;
  for (const c of cards) {
    if (c.kind === 'yellow') continue;
    const off = Math.max(from, c.minute);
    const share = Math.max(0, to - off) / span;
    if (c.clubId === clubId) { mine *= 1 - (1 - TEN_MEN) * share; theirs *= 1 + (TEN_MEN_AGAINST - 1) * share; }
  }
  return { mine, theirs };
}

/** Goals scored in one half by one side: a Poisson draw on half the match rate. */
function halfGoals(ctx: Ctx, lambda: number, count: number, sel: Selection, clubId: string, from: number, to: number, cards: CardEvent[] = []): GoalEvent[] {
  void lambda;
  const sentOff = cards.filter((c) => c.clubId === clubId && c.kind !== 'yellow');
  const out: GoalEvent[] = [];
  for (let i = 0; i < count; i++) {
    const minute = ctx.rng.int(from, to);
    // A man already off cannot score.
    const off = new Set(sentOff.filter((c) => c.minute <= minute).map((c) => c.playerId));
    out.push({ minute, clubId, ...pickScorer(ctx, sel, off) });
  }
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
  cards: CardEvent[];
  derby: boolean;
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
      const own = s.cards.filter((c) => c.playerId === id);
      rating -= own.filter((c) => c.kind === 'yellow').length * 0.25;
      rating -= own.some((c) => c.kind !== 'yellow') ? 1.4 : 0;
      rating += rng.normal(0, 0.35);
      playerStats[id] = {
        minutes,
        goals: scored,
        assists: assisted,
        rating: clamp(Math.round(rating * 10) / 10, 3, 10),
        fitnessDelta: -(14 - p.attrs.physical / 20) * (minutes / 90),
      };
      const clubId = world.clubs[fixture.homeClubId].id === p.clubId ? fixture.homeClubId : p.clubId ?? fixture.awayClubId;
      // A squad worked on its fitness goes down less often.
      const trainingInjury = clubId === world.humanClubId && world.training === 'fitness' ? 0.8 : 1;
      if (rng.chance(INJURY_CHANCE * (minutes / 90) * medicalFactor(world, clubId) * trainingInjury)) {
        injuries.push({ playerId: id, days: Math.max(2, Math.round(rng.int(3, 45) * recoveryFactor(world, clubId))) });
      }
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
    cards: s.cards,
    penalties,
    attendance: s.attendance,
    derby: s.derby,
    halfTimeScore: s.htScore,
    subs: s.subs,
    tacticChange: s.tacticChange,
  };
  return { homeGoals, awayGoals, winnerId, report, playerStats, injuries };
}

/** The same side minus anyone sent off, so ten men really are ten men. */
function elevenLeft(world: World, sel: Selection, off: Set<string>, tactic: Tactic): Selection {
  if (off.size === 0) return sel;
  return selectionFromIds(world, sel.playerIds.filter((id) => !off.has(id)), sel.formation, tactic);
}

/** Plays the whole match in one pass: both halves on the same basis. */
export function simulateMatch(ctx: Ctx, fixture: Fixture): MatchOutcome {
  const { world, rng } = ctx;
  const homeClub = world.clubs[fixture.homeClubId];
  const awayClub = world.clubs[fixture.awayClubId];
  const derby = isDerby(world, fixture);
  const homeSel = selectXI(world, homeClub.id, homeClub.tactic);
  const awaySel = selectXI(world, awayClub.id, awayClub.tactic);
  const homeSide = sideInput(world, homeClub.id, homeSel, homeClub.tactic, true, derby);
  const awaySide = sideInput(world, awayClub.id, awaySel, awayClub.tactic, false, derby);
  const xgHome = expectedGoals(homeSide, awaySide);
  const xgAway = expectedGoals(awaySide, homeSide);

  const goals: GoalEvent[] = [];
  const cards: CardEvent[] = [];
  const booked = { home: new Set<string>(), away: new Set<string>() };
  const off = { home: new Set<string>(), away: new Set<string>() };
  // The second half is played by whoever is still on the pitch.
  let homeSel2 = homeSel, awaySel2 = awaySel;
  let htHome = 0, htAway = 0;
  for (const [from, to] of [[1, 45], [46, 90]] as const) {
    const hs = from === 1 ? homeSel : homeSel2, as = from === 1 ? awaySel : awaySel2;
    cards.push(...halfCards(ctx, hs, homeClub.id, from, to, booked.home, off.home, derby));
    cards.push(...halfCards(ctx, as, awayClub.id, from, to, booked.away, off.away, derby));
    const mpHome = manpower(cards, homeClub.id, from, to);
    const mpAway = manpower(cards, awayClub.id, from, to);
    const h = rng.poisson((xgHome.lambda / 2) * mpHome.mine * mpAway.theirs);
    const a = rng.poisson((xgAway.lambda / 2) * mpAway.mine * mpHome.theirs);
    goals.push(...halfGoals(ctx, xgHome.lambda, h, hs, homeClub.id, from, to, cards));
    goals.push(...halfGoals(ctx, xgAway.lambda, a, as, awayClub.id, from, to, cards));
    if (from === 1) {
      htHome = h; htAway = a;
      homeSel2 = elevenLeft(world, homeSel, off.home, homeClub.tactic);
      awaySel2 = elevenLeft(world, awaySel, off.away, awayClub.tactic);
    }
  }
  goals.sort((a, b) => a.minute - b.minute || a.clubId.localeCompare(b.clubId));
  cards.sort((a, b) => a.minute - b.minute || a.clubId.localeCompare(b.clubId));

  return settle(ctx, {
    fixture,
    homeSel1: homeSel, awaySel1: awaySel, homeSel2, awaySel2,
    goals,
    htScore: { home: htHome, away: htAway },
    xgHome, xgAway,
    second: null,
    subs: [],
    tacticChange: null,
    attendance: attendanceFor(world, fixture),
    cards,
    derby,
  });
}

/** Plays the first 45 minutes and returns the state to pause on. */
export function simulateFirstHalf(ctx: Ctx, fixture: Fixture, clubId: string): HalfTimeState {
  const { world, rng } = ctx;
  const homeClub = world.clubs[fixture.homeClubId];
  const awayClub = world.clubs[fixture.awayClubId];
  const derby = isDerby(world, fixture);
  const homeSel = selectXI(world, homeClub.id, homeClub.tactic);
  const awaySel = selectXI(world, awayClub.id, awayClub.tactic);
  const homeSide = sideInput(world, homeClub.id, homeSel, homeClub.tactic, true, derby);
  const awaySide = sideInput(world, awayClub.id, awaySel, awayClub.tactic, false, derby);
  const xgHome = expectedGoals(homeSide, awaySide);
  const xgAway = expectedGoals(awaySide, homeSide);

  const bookedHome = new Set<string>(), bookedAway = new Set<string>();
  const offHome = new Set<string>(), offAway = new Set<string>();
  const cards = [
    ...halfCards(ctx, homeSel, homeClub.id, 1, 45, bookedHome, offHome, derby),
    ...halfCards(ctx, awaySel, awayClub.id, 1, 45, bookedAway, offAway, derby),
  ].sort((x, y) => x.minute - y.minute || x.clubId.localeCompare(y.clubId));
  const mpHome = manpower(cards, homeClub.id, 1, 45);
  const mpAway = manpower(cards, awayClub.id, 1, 45);
  const h = rng.poisson((xgHome.lambda / 2) * mpHome.mine * mpAway.theirs);
  const a = rng.poisson((xgAway.lambda / 2) * mpAway.mine * mpHome.theirs);
  const goals = [
    ...halfGoals(ctx, xgHome.lambda, h, homeSel, homeClub.id, 1, 45, cards),
    ...halfGoals(ctx, xgAway.lambda, a, awaySel, awayClub.id, 1, 45, cards),
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
    cards,
    bookedHome: [...bookedHome],
    bookedAway: [...bookedAway],
    derby,
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

  const offHome = new Set(ht.cards.filter((c) => c.kind !== 'yellow' && c.clubId === fixture.homeClubId).map((c) => c.playerId));
  const offAway = new Set(ht.cards.filter((c) => c.kind !== 'yellow' && c.clubId === fixture.awayClubId).map((c) => c.playerId));

  const homeSel1 = selectionFromIds(world, ht.homeXI, ht.homeFormation, ht.homeTactic);
  const awaySel1 = selectionFromIds(world, ht.awayXI, ht.awayFormation, ht.awayTactic);
  // Anyone sent off in the first half takes no part in the second.
  const mine1 = elevenLeft(world, humanHome ? homeSel1 : awaySel1, humanHome ? offHome : offAway, humanHome ? ht.homeTactic : ht.awayTactic);
  const newTactic = decision.tactic ?? (humanHome ? ht.homeTactic : ht.awayTactic);
  const oldTactic = humanHome ? ht.homeTactic : ht.awayTactic;
  const { sel: mine2, applied } = applySubs(world, mine1, decision.subs ?? []);

  const homeSel2 = humanHome ? mine2 : elevenLeft(world, homeSel1, offHome, ht.homeTactic);
  const awaySel2 = humanHome ? elevenLeft(world, awaySel1, offAway, ht.awayTactic) : mine2;
  const homeTactic2 = humanHome ? newTactic : ht.homeTactic;
  const awayTactic2 = humanHome ? ht.awayTactic : newTactic;

  const homeSide2 = sideInput(world, fixture.homeClubId, homeSel2, homeTactic2, true, ht.derby);
  const awaySide2 = sideInput(world, fixture.awayClubId, awaySel2, awayTactic2, false, ht.derby);
  const xg2Home = expectedGoals(homeSide2, awaySide2);
  const xg2Away = expectedGoals(awaySide2, homeSide2);

  const bookedHome = new Set(ht.bookedHome), bookedAway = new Set(ht.bookedAway);
  const cards = [
    ...ht.cards,
    ...halfCards(ctx, homeSel2, fixture.homeClubId, 46, 90, bookedHome, offHome, ht.derby),
    ...halfCards(ctx, awaySel2, fixture.awayClubId, 46, 90, bookedAway, offAway, ht.derby),
  ].sort((x, y) => x.minute - y.minute || x.clubId.localeCompare(y.clubId));
  const mp2Home = manpower(cards, fixture.homeClubId, 46, 90);
  const mp2Away = manpower(cards, fixture.awayClubId, 46, 90);
  const h2 = rng.poisson((xg2Home.lambda / 2) * mp2Home.mine * mp2Away.theirs);
  const a2 = rng.poisson((xg2Away.lambda / 2) * mp2Away.mine * mp2Home.theirs);
  const goals = [
    ...ht.goals,
    ...halfGoals(ctx, xg2Home.lambda, h2, homeSel2, fixture.homeClubId, 46, 90, cards),
    ...halfGoals(ctx, xg2Away.lambda, a2, awaySel2, fixture.awayClubId, 46, 90, cards),
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
    cards,
    derby: ht.derby,
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

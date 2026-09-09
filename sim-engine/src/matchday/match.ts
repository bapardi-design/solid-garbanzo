/**
 * Match engine. Expected goals for each side are built from a base rate and a
 * list of named multiplicative factors, so every result can be explained.
 * Goals are drawn from a Poisson distribution; scorers are weighted by
 * position and rating.
 */
import type { Ctx } from '../core/context.js';
import type { PlayerMatchStats } from '../core/events.js';
import { clamp } from '../core/rng.js';
import type { Fixture, GoalEvent, GoalFactor, MatchReport, Player, Position, Tactic, World } from '../core/schema.js';
import { effectiveRating } from '../rating.js';
import { selectXI, type Selection } from './xi.js';

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

export function simulateMatch(ctx: Ctx, fixture: Fixture): MatchOutcome {
  const { world, rng } = ctx;
  const homeClub = world.clubs[fixture.homeClubId];
  const awayClub = world.clubs[fixture.awayClubId];
  const homeSel = selectXI(world, homeClub.id, homeClub.tactic);
  const awaySel = selectXI(world, awayClub.id, awayClub.tactic);

  const homeSide: SideInput = { clubId: homeClub.id, lines: teamLines(world, homeSel), tactic: homeClub.tactic, managerAbility: managerAbility(world, homeClub.id), form: clubForm(world, homeClub.id), home: true };
  const awaySide: SideInput = { clubId: awayClub.id, lines: teamLines(world, awaySel), tactic: awayClub.tactic, managerAbility: managerAbility(world, awayClub.id), form: clubForm(world, awayClub.id), home: false };

  const xgHome = expectedGoals(homeSide, awaySide);
  const xgAway = expectedGoals(awaySide, homeSide);

  const homeGoals = rng.poisson(xgHome.lambda);
  const awayGoals = rng.poisson(xgAway.lambda);

  const goals: GoalEvent[] = [];
  for (let i = 0; i < homeGoals; i++) goals.push({ minute: rng.int(1, 90), clubId: homeClub.id, ...pickScorer(ctx, homeSel) });
  for (let i = 0; i < awayGoals; i++) goals.push({ minute: rng.int(1, 90), clubId: awayClub.id, ...pickScorer(ctx, awaySel) });
  goals.sort((a, b) => a.minute - b.minute || a.clubId.localeCompare(b.clubId));

  let winnerId: string | null = homeGoals > awayGoals ? homeClub.id : awayGoals > homeGoals ? awayClub.id : null;
  let penalties: MatchReport['penalties'] = null;
  if (fixture.knockout && winnerId === null) {
    let h = 0, a = 0;
    for (let i = 0; i < 5 || h === a; i++) {
      if (rng.chance(0.76)) h++;
      if (rng.chance(0.76)) a++;
      if (i > 20) { h++; break; }
    }
    penalties = { home: h, away: a };
    winnerId = h > a ? homeClub.id : awayClub.id;
  }

  const playerStats: Record<string, PlayerMatchStats> = {};
  const injuries: { playerId: string; days: number }[] = [];
  const tally = (sel: Selection, goalsFor: number, goalsAgainst: number, side: string) => {
    for (const id of sel.playerIds) {
      const p: Player = world.players[id];
      const scored = goals.filter((g) => g.scorerId === id).length;
      const assisted = goals.filter((g) => g.assistId === id).length;
      let rating = 6.0 + scored * 1.0 + assisted * 0.5;
      if ((p.position === 'GK' || p.position === 'DF') && goalsAgainst === 0) rating += 0.6;
      rating -= goalsAgainst * 0.12;
      rating += (goalsFor - goalsAgainst) * 0.15;
      rating += rng.normal(0, 0.35);
      playerStats[id] = {
        minutes: 90,
        goals: scored,
        assists: assisted,
        rating: clamp(Math.round(rating * 10) / 10, 3, 10),
        fitnessDelta: -(14 - p.attrs.physical / 20),
      };
      if (rng.chance(INJURY_CHANCE)) injuries.push({ playerId: id, days: rng.int(3, 45) });
      void side;
    }
  };
  tally(homeSel, homeGoals, awayGoals, 'home');
  tally(awaySel, awayGoals, homeGoals, 'away');

  const report: MatchReport = {
    homeXI: homeSel.playerIds,
    awayXI: awaySel.playerIds,
    homeFormation: homeSel.formation,
    awayFormation: awaySel.formation,
    lambda: { home: xgHome.lambda, away: xgAway.lambda },
    factors: { home: xgHome.factors, away: xgAway.factors },
    goals,
    penalties,
    attendance: attendanceFor(world, fixture),
  };
  return { homeGoals, awayGoals, winnerId, report, playerStats, injuries };
}

/** Human-readable explanation of a played fixture's expected goals. */
export function explainMatch(world: World, fixture: Fixture): string {
  const r = fixture.report;
  const h = world.clubs[fixture.homeClubId];
  const a = world.clubs[fixture.awayClubId];
  if (!r) return `${h.name} v ${a.name}: not played`;
  const lines: string[] = [];
  lines.push(`${h.name} ${fixture.homeGoals} - ${fixture.awayGoals} ${a.name}  (day ${fixture.day}, ${r.homeFormation} v ${r.awayFormation}, att ${r.attendance})`);
  const side = (label: string, factors: GoalFactor[], lambda: number) => {
    lines.push(`  ${label} xG ${lambda.toFixed(2)}:`);
    for (const f of factors) lines.push(`    ${f.name.padEnd(9)} x${f.multiplier.toFixed(3)}  ${f.note}`);
  };
  side(h.short, r.factors.home, r.lambda.home);
  side(a.short, r.factors.away, r.lambda.away);
  for (const g of r.goals) {
    const scorer = world.players[g.scorerId]?.name ?? g.scorerId;
    const assist = g.assistId ? ` (assist ${world.players[g.assistId]?.name ?? g.assistId})` : '';
    lines.push(`  ${String(g.minute).padStart(2)}' ${world.clubs[g.clubId].short} ${scorer}${assist}`);
  }
  if (r.penalties) lines.push(`  penalties ${r.penalties.home}-${r.penalties.away}`);
  return lines.join('\n');
}

/** Builds the initial world: nations, clubs, squads, managers. Emits creation events. */
import type { Ctx } from '../core/context.js';
import { clamp, round1 } from '../core/rng.js';
import type { Attributes, Club, Contract, Manager, Nation, Player, Position, WorldConfig } from '../core/schema.js';
import { isRealWorld, nextId, tierCode } from '../core/schema.js';
import { overall, playerValue, wageDemand } from '../rating.js';
import { NATIONS, clubNames, personName, pickNationality } from './nations.js';
import { REAL_WORLD, parsePlayer, type ClubData } from './data/index.js';

export const MIN_CONTRACT_SEASONS = 1;
export const MAX_CONTRACT_SEASONS = 4;

/** Contract length in seasons; never zero. Older players get shorter deals. */
export function contractLengthFor(age: number, rng: Ctx['rng']): number {
  if (age >= 33) return 1;
  if (age >= 30) return rng.int(1, 2);
  if (age <= 21) return rng.int(2, MAX_CONTRACT_SEASONS);
  return rng.int(MIN_CONTRACT_SEASONS, MAX_CONTRACT_SEASONS);
}

export function makeContract(ctx: Ctx, playerId: string, clubId: string, wage: number, lengthSeasons: number): Contract {
  const length = Math.max(MIN_CONTRACT_SEASONS, Math.round(lengthSeasons));
  const startSeason = ctx.world.season;
  return {
    id: nextId(ctx.world, 'k'),
    playerId,
    clubId,
    wage: Math.max(1, Math.round(wage * 10) / 10),
    startSeason,
    endSeason: startSeason + length - 1,
    lengthSeasons: length,
  };
}

/** @deprecated use tierCode(nationId, tier); kept for custom worlds. */
export function leagueId(tier: number): string { return tierCode('CUS', tier); }

function basePlayer(ctx: Ctx, clubId: string | null, position: Position, name: string, age: number, nationality: string, attrs: Attributes): Player {
  return {
    id: nextId(ctx.world, 'p'),
    name,
    age,
    position,
    nationality,
    attrs,
    potential: 0,
    clubId,
    contractId: null,
    loan: null,
    morale: ctx.rng.int(45, 65),
    fitness: 100,
    form: 50,
    injuryDays: 0,
    value: 0,
    stats: { apps: 0, goals: 0, assists: 0, minutes: 0, ratingSum: 0 },
    career: { apps: 0, goals: 0 },
    retired: false,
    lastStartDay: -1,
    freeSince: clubId ? null : ctx.world.day,
    listedAt: null,
  };
}

function attrsAround(rng: Ctx['rng'], position: Position, base: number): Attributes {
  const noise = () => clamp(round1(base + rng.normal(0, 5)), 1, 99);
  const attrs: Attributes = {
    pace: noise(), technique: noise(), physical: noise(), mental: noise(),
    goalkeeping: position === 'GK' ? noise() : clamp(round1(rng.normal(15, 5)), 1, 40),
  };
  if (position === 'GK') { attrs.pace = clamp(round1(attrs.pace - 8), 1, 99); attrs.technique = clamp(round1(attrs.technique - 6), 1, 99); }
  if (position === 'FW') attrs.pace = clamp(round1(attrs.pace + 3), 1, 99);
  if (position === 'DF') attrs.physical = clamp(round1(attrs.physical + 3), 1, 99);
  return attrs;
}

/** Scales attributes so the position-weighted overall lands on `target`. */
function fitToOverall(p: Player, target: number): void {
  for (let i = 0; i < 4; i++) {
    const current = overall(p);
    const factor = target / Math.max(1, current);
    for (const k of ['pace', 'technique', 'physical', 'mental'] as const) p.attrs[k] = clamp(round1(p.attrs[k] * factor), 1, 99);
    if (p.position === 'GK') p.attrs.goalkeeping = clamp(round1(p.attrs.goalkeeping * factor), 1, 99);
  }
}

function assignPotential(p: Player, rng: Ctx['rng'], real: boolean): void {
  const ovr = overall(p);
  const growth = p.age < 24 ? rng.int(2, 18) * ((24 - p.age) / 7) : p.age < 27 ? rng.int(0, 4) : 0;
  p.potential = clamp(Math.round(Math.max(ovr, ovr + growth)), 1, 99);
  p.value = playerValue(p, real);
}

export function generatePlayer(ctx: Ctx, clubId: string | null, position: Position, reputation: number, ageOverride?: number, nationality?: string): Player {
  const { rng } = ctx;
  const age = ageOverride ?? rng.weighted([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
    [2, 3, 4, 5, 6, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3, 2, 1, 1]);
  const peak = clamp(rng.normal(reputation * 0.7 + 14, 6), 20, 92);
  const maturity = age >= 27 ? 1 : 0.72 + (age - 17) * 0.028;
  const nat = nationality ?? 'CUS';
  const player = basePlayer(ctx, clubId, position, personName(nat, rng), age, nat, attrsAround(rng, position, peak * maturity));
  assignPotential(player, rng, isRealWorld(ctx.world));
  return player;
}

/** A real player from the dataset: attributes fitted to the listed overall. */
export function realPlayer(ctx: Ctx, clubId: string, row: string): Player {
  const r = parsePlayer(row);
  const player = basePlayer(ctx, clubId, r.pos, r.name, r.age, r.nat, attrsAround(ctx.rng, r.pos, r.overall));
  fitToOverall(player, r.overall);
  assignPotential(player, ctx.rng, true);
  return player;
}

export function squadTemplate(size: number): Position[] {
  const gk = Math.max(2, Math.round(size * 0.125));
  const fw = Math.max(3, Math.round(size * 0.21));
  const remaining = size - gk - fw;
  const df = Math.ceil(remaining / 2);
  const mf = remaining - df;
  const out: Position[] = [];
  for (let i = 0; i < gk; i++) out.push('GK');
  for (let i = 0; i < df; i++) out.push('DF');
  for (let i = 0; i < mf; i++) out.push('MF');
  for (let i = 0; i < fw; i++) out.push('FW');
  return out;
}

export function generateManager(ctx: Ctx, clubId: string | null, reputation: number, nationId = 'CUS'): Manager {
  const { rng, world } = ctx;
  return {
    id: nextId(world, 'm', 4),
    name: personName(nationId, rng),
    clubId,
    ability: clamp(Math.round(rng.normal(reputation * 0.7 + 15, 8)), 25, 95),
    reputation: clamp(Math.round(reputation + rng.normal(0, 8)), 1, 100),
    contractEndSeason: world.season + rng.int(1, 3),
    unemployedSince: clubId ? null : world.day,
  };
}

function nationFromSpec(id: string, tiers?: number[]): Nation {
  const spec = NATIONS[id] ?? NATIONS.CUS;
  return {
    id, name: spec.name, adjective: spec.adjective, tiers: tiers ?? spec.tiers, leagueNames: spec.leagueNames, cupName: spec.cupName,
    leagueCupName: spec.leagueCupName, coefficient: spec.coefficient, continentalSlots: spec.continentalSlots, currency: spec.currency,
  };
}

function initialBalance(reputation: number, real: boolean, rng: Ctx['rng']): number {
  return real ? Math.round(Math.pow(reputation, 2.5) * 0.6 * rng.float(0.7, 1.3)) : Math.round(reputation * reputation * 6 * rng.float(0.7, 1.3));
}

function emitClub(ctx: Ctx, nation: Nation, tier: number, data: ClubData, real: boolean): Club {
  const { rng, world } = ctx;
  const club: Club = {
    id: nextId(world, 'c', 3),
    name: data.name,
    short: data.short,
    city: data.city,
    nationId: nation.id,
    leagueId: tierCode(nation.id, tier),
    reputation: data.reputation,
    balance: initialBalance(data.reputation, real, rng),
    stadiumCapacity: data.capacity,
    managerId: null,
    tactic: 'balanced',
    wageBudget: 0,
    transferBudget: 0,
    boardTarget: 1,
    ledger: {},
    form: [],
  };
  ctx.emit('CLUB_CREATED', { club });
  return club;
}

function signGenerated(ctx: Ctx, player: Player, clubId: string, real: boolean): void {
  ctx.emit('PLAYER_CREATED', { player });
  const contract = makeContract(ctx, player.id, clubId, wageDemand(player, real) * ctx.rng.float(0.85, 1.15), contractLengthFor(player.age, ctx.rng));
  ctx.emit('CONTRACT_SIGNED', { contract, record: null });
}

function fillSquad(ctx: Ctx, club: Club, tier: number, nation: Nation, existing: Player[], real: boolean): void {
  const { rng, world } = ctx;
  const template = squadTemplate(world.config.squadSize);
  const counts: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const p of existing) counts[p.position]++;
  const needed: Position[] = [];
  for (const pos of ['GK', 'DF', 'MF', 'FW'] as const) {
    const want = template.filter((t) => t === pos).length;
    for (let i = counts[pos]; i < want; i++) needed.push(pos);
  }
  // Depth players sit below the listed stars.
  const depthRep = existing.length > 0 ? club.reputation * 0.82 : club.reputation;
  for (const pos of needed) {
    const nat = pickNationality(nation.id, tier, rng, real);
    signGenerated(ctx, generatePlayer(ctx, club.id, pos, depthRep, undefined, nat), club.id, real);
  }
}

export function generateWorld(ctx: Ctx, config: WorldConfig): void {
  const { rng, world } = ctx;
  const real = config.world === 'real';
  ctx.emit('WORLD_CREATED', { seed: config.seed, config });

  const nationIds = real ? config.nations.filter((n) => REAL_WORLD[n]) : ['CUS'];
  const nations: Nation[] = nationIds.map((id) => real
    ? nationFromSpec(id, REAL_WORLD[id].tiers.map((t) => t.length))
    : nationFromSpec('CUS', Array.from({ length: config.leagues }, () => config.clubsPerLeague)));
  for (const nation of nations) ctx.emit('NATION_CREATED', { nation });

  const seenPlayers = new Set<string>();
  for (const nation of nations) {
    const customNames = real ? null : clubNames('CUS', nation.tiers.reduce((a, b) => a + b, 0), rng);
    let nameIdx = 0;
    nation.tiers.forEach((count, tierIdx) => {
      const tier = tierIdx + 1;
      for (let i = 0; i < count; i++) {
        const data: ClubData = real
          ? REAL_WORLD[nation.id].tiers[tierIdx][i]
          : (() => { const n = customNames![nameIdx++]; const repCentre = 82 - tierIdx * 18; return { name: n.name, short: n.short, city: n.city, capacity: Math.round(clamp(repCentre * 650 * rng.float(0.8, 1.2), 4000, 80000)), reputation: clamp(Math.round(rng.normal(repCentre, 7)), 15, 95) }; })();
        const club = emitClub(ctx, nation, tier, data, real);
        const existing: Player[] = [];
        for (const row of data.players ?? []) {
          const name = row.split(',')[0].trim();
          if (seenPlayers.has(name)) continue;
          seenPlayers.add(name);
          const player = realPlayer(ctx, club.id, row);
          existing.push(player);
          signGenerated(ctx, player, club.id, real);
        }
        fillSquad(ctx, club, tier, nation, existing, real);
        ctx.emit('MANAGER_CREATED', { manager: generateManager(ctx, club.id, data.reputation, nation.id) });
      }
    });
    // Unemployed managers and a free-agent pool per nation.
    for (let i = 0; i < 4; i++) ctx.emit('MANAGER_CREATED', { manager: generateManager(ctx, null, rng.int(30, 75), nation.id) });
    for (let i = 0; i < 8; i++) {
      const pos = rng.pick(['GK', 'DF', 'DF', 'MF', 'MF', 'FW'] as const);
      ctx.emit('PLAYER_CREATED', { player: generatePlayer(ctx, null, pos, rng.int(25, 60), undefined, pickNationality(nation.id, 2, rng, real)) });
    }
  }
}

/** Builds the initial world: leagues, clubs, squads, managers. Emits creation events. */
import type { Ctx } from '../core/context.js';
import { clamp, round1 } from '../core/rng.js';
import type { Attributes, Club, Contract, Manager, Player, Position, WorldConfig } from '../core/schema.js';
import { nextId } from '../core/schema.js';
import { overall, playerValue, wageDemand } from '../rating.js';
import { CITIES, FIRST_NAMES, LAST_NAMES, SUFFIXES } from './names.js';

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
    wage: Math.max(1, Math.round(wage)),
    startSeason,
    endSeason: startSeason + length - 1,
    lengthSeasons: length,
  };
}

export function leagueId(tier: number): string { return `L${tier}`; }

function randomName(rng: Ctx['rng']): string { return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`; }

export function generatePlayer(ctx: Ctx, clubId: string | null, position: Position, reputation: number, ageOverride?: number): Player {
  const { rng, world } = ctx;
  const age = ageOverride ?? rng.weighted([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
    [2, 3, 4, 5, 6, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3, 2, 1, 1]);
  const peak = clamp(rng.normal(reputation * 0.7 + 14, 7), 20, 92);
  const maturity = age >= 27 ? 1 : 0.72 + (age - 17) * 0.028;
  const base = peak * maturity;
  const noise = () => clamp(round1(base + rng.normal(0, 6)), 1, 99);
  const attrs: Attributes = {
    pace: noise(), technique: noise(), physical: noise(), mental: noise(),
    goalkeeping: position === 'GK' ? noise() : clamp(round1(rng.normal(15, 5)), 1, 40),
  };
  if (position === 'GK') { attrs.pace = clamp(round1(attrs.pace - 8), 1, 99); attrs.technique = clamp(round1(attrs.technique - 6), 1, 99); }
  if (position === 'FW') attrs.pace = clamp(round1(attrs.pace + 3), 1, 99);
  if (position === 'DF') attrs.physical = clamp(round1(attrs.physical + 3), 1, 99);
  const player: Player = {
    id: nextId(world, 'p'),
    name: randomName(rng),
    age,
    position,
    attrs,
    potential: 0,
    clubId,
    contractId: null,
    loan: null,
    morale: rng.int(45, 65),
    fitness: 100,
    form: 50,
    injuryDays: 0,
    value: 0,
    stats: { apps: 0, goals: 0, assists: 0, minutes: 0, ratingSum: 0 },
    career: { apps: 0, goals: 0 },
    retired: false,
    lastStartDay: -1,
    freeSince: clubId ? null : world.day,
  };
  const ovr = overall(player);
  const growth = age < 24 ? rng.int(2, 18) * ((24 - age) / 7) : age < 27 ? rng.int(0, 4) : 0;
  player.potential = clamp(Math.round(Math.max(ovr, ovr + growth)), 1, 99);
  player.value = playerValue(player);
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

export function generateManager(ctx: Ctx, clubId: string | null, reputation: number): Manager {
  const { rng, world } = ctx;
  return {
    id: nextId(world, 'm', 4),
    name: randomName(rng),
    clubId,
    ability: clamp(Math.round(rng.normal(reputation * 0.7 + 15, 8)), 25, 95),
    reputation: clamp(Math.round(reputation + rng.normal(0, 8)), 1, 100),
    contractEndSeason: world.season + rng.int(1, 3),
    unemployedSince: clubId ? null : world.day,
  };
}

export function generateWorld(ctx: Ctx, config: WorldConfig): void {
  const { rng, world } = ctx;
  ctx.emit('WORLD_CREATED', { seed: config.seed, config });
  const cities = rng.shuffle([...CITIES]);
  let cityIdx = 0;
  const template = squadTemplate(config.squadSize);

  for (let tier = 1; tier <= config.leagues; tier++) {
    for (let i = 0; i < config.clubsPerLeague; i++) {
      const city = cities[cityIdx % cities.length];
      const suffix = rng.pick(SUFFIXES);
      cityIdx++;
      const repCentre = 82 - (tier - 1) * 18;
      const reputation = clamp(Math.round(rng.normal(repCentre, 7)), 15, 95);
      const club: Club = {
        id: nextId(world, 'c', 3),
        name: `${city} ${suffix}`,
        short: city.slice(0, 3).toUpperCase(),
        leagueId: leagueId(tier),
        reputation,
        balance: Math.round(reputation * reputation * 6 * rng.float(0.7, 1.3)),
        stadiumCapacity: Math.round(clamp(reputation * 650 * rng.float(0.8, 1.2), 4000, 80000)),
        managerId: null,
        tactic: 'balanced',
        wageBudget: 0,
        transferBudget: 0,
        boardTarget: 1,
        ledger: {},
        form: [],
      };
      ctx.emit('CLUB_CREATED', { club });
      for (const pos of template) {
        const player = generatePlayer(ctx, club.id, pos, reputation);
        ctx.emit('PLAYER_CREATED', { player });
        const contract = makeContract(ctx, player.id, club.id, wageDemand(player) * rng.float(0.85, 1.15), contractLengthFor(player.age, rng));
        ctx.emit('CONTRACT_SIGNED', { contract, record: null });
      }
      ctx.emit('MANAGER_CREATED', { manager: generateManager(ctx, club.id, reputation) });
    }
  }
  // Unemployed manager pool so sackings can be replaced.
  for (let i = 0; i < config.leagues * 3; i++) {
    ctx.emit('MANAGER_CREATED', { manager: generateManager(ctx, null, rng.int(30, 75)) });
  }
  // Small free-agent pool.
  for (let i = 0; i < config.leagues * 6; i++) {
    const pos = rng.pick(['GK', 'DF', 'DF', 'MF', 'MF', 'FW'] as const);
    ctx.emit('PLAYER_CREATED', { player: generatePlayer(ctx, null, pos, rng.int(25, 60)) });
  }
}

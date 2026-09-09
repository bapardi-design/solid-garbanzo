/** World state schema. All money values are in thousands (k). */
export type Position = 'GK' | 'DF' | 'MF' | 'FW';
export const POSITIONS: readonly Position[] = ['GK', 'DF', 'MF', 'FW'];

export interface Attributes {
  pace: number;
  technique: number;
  physical: number;
  mental: number;
  goalkeeping: number;
}
export const ATTRIBUTE_KEYS: readonly (keyof Attributes)[] = ['pace', 'technique', 'physical', 'mental', 'goalkeeping'];

export interface PlayerSeasonStats {
  apps: number;
  goals: number;
  assists: number;
  minutes: number;
  ratingSum: number;
}

export interface Loan {
  toClubId: string;
  returnSeason: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  attrs: Attributes;
  /** Ceiling for overall rating (1-99). */
  potential: number;
  /** Club the player currently plays for (loan club while on loan). */
  clubId: string | null;
  contractId: string | null;
  loan: Loan | null;
  morale: number;
  fitness: number;
  form: number;
  injuryDays: number;
  value: number;
  stats: PlayerSeasonStats;
  career: { apps: number; goals: number };
  retired: boolean;
  /** Day the player last started a match; -1 if never. */
  lastStartDay: number;
  /** Day the player became a free agent; null while under contract. */
  freeSince: number | null;
}

export interface Contract {
  id: string;
  playerId: string;
  clubId: string;
  /** Weekly wage in k. */
  wage: number;
  startSeason: number;
  /** Last season the contract covers; it expires at the end of this season. */
  endSeason: number;
  /** Cached endSeason - startSeason + 1; always >= 1. */
  lengthSeasons: number;
}

export type Tactic = 'balanced' | 'attacking' | 'defensive';

export interface Club {
  id: string;
  name: string;
  short: string;
  leagueId: string;
  reputation: number;
  balance: number;
  stadiumCapacity: number;
  managerId: string | null;
  tactic: Tactic;
  wageBudget: number;
  transferBudget: number;
  /** League position the board expects at season end. */
  boardTarget: number;
  /** Season-to-date ledger by category. */
  ledger: Record<string, number>;
  /** Points from the most recent league matches, newest last (max 6 kept). */
  form: number[];
}

export interface Manager {
  id: string;
  name: string;
  clubId: string | null;
  ability: number;
  reputation: number;
  contractEndSeason: number;
  unemployedSince: number | null;
}

export interface CompetitionLeague {
  id: string;
  kind: 'league';
  name: string;
  season: number;
  tier: number;
  clubIds: string[];
  promote: number;
  relegate: number;
  complete: boolean;
}

export interface CompetitionCup {
  id: string;
  kind: 'cup';
  name: string;
  season: number;
  clubIds: string[];
  alive: string[];
  round: number;
  totalRounds: number;
  complete: boolean;
  winnerId: string | null;
}

export type Competition = CompetitionLeague | CompetitionCup;

export interface GoalFactor {
  name: string;
  /** Multiplier applied to the expected-goals base. */
  multiplier: number;
  note: string;
}

export interface GoalEvent {
  minute: number;
  clubId: string;
  scorerId: string;
  assistId: string | null;
}

export interface MatchReport {
  homeXI: string[];
  awayXI: string[];
  homeFormation: string;
  awayFormation: string;
  lambda: { home: number; away: number };
  factors: { home: GoalFactor[]; away: GoalFactor[] };
  goals: GoalEvent[];
  penalties: { home: number; away: number } | null;
  attendance: number;
}

export interface Fixture {
  id: string;
  competitionId: string;
  season: number;
  round: number;
  day: number;
  homeClubId: string;
  awayClubId: string;
  knockout: boolean;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  winnerId: string | null;
  report: MatchReport | null;
}

export type TransferKind = 'transfer' | 'free' | 'loan' | 'loan_return' | 'renewal';

export interface TransferRecord {
  id: string;
  season: number;
  day: number;
  playerId: string;
  fromClubId: string | null;
  toClubId: string;
  fee: number;
  kind: TransferKind;
}

export interface SeasonSummary {
  season: number;
  /** competitionId -> winning clubId */
  champions: Record<string, string>;
  promoted: string[];
  relegated: string[];
  topScorer: { playerId: string; goals: number } | null;
  /** Squad size per club at the final whistle, before contract expiries. */
  squadSizes: Record<string, number>;
}

export interface Indexes {
  squadByClub: Record<string, string[]>;
  contractByPlayer: Record<string, string>;
  fixturesByDay: Record<number, string[]>;
  fixturesByCompetition: Record<string, string[]>;
}

export interface WorldConfig {
  seed: string;
  leagues: number;
  clubsPerLeague: number;
  squadSize: number;
  seasonLength: number;
  cup: boolean;
}

export interface World {
  config: WorldConfig;
  seed: string;
  day: number;
  season: number;
  seasonStartDay: number;
  seasonLength: number;
  players: Record<string, Player>;
  clubs: Record<string, Club>;
  managers: Record<string, Manager>;
  contracts: Record<string, Contract>;
  competitions: Record<string, Competition>;
  fixtures: Record<string, Fixture>;
  transfers: TransferRecord[];
  freeAgents: string[];
  history: SeasonSummary[];
  counters: Record<string, number>;
  idx: Indexes;
}

export const DEFAULT_CONFIG: WorldConfig = {
  seed: 'default',
  leagues: 2,
  clubsPerLeague: 12,
  squadSize: 24,
  seasonLength: 364,
  cup: true,
};

export function createEmptyWorld(config: WorldConfig): World {
  return {
    config,
    seed: config.seed,
    day: -1,
    season: 1,
    seasonStartDay: 0,
    seasonLength: config.seasonLength,
    players: {},
    clubs: {},
    managers: {},
    contracts: {},
    competitions: {},
    fixtures: {},
    transfers: [],
    freeAgents: [],
    history: [],
    counters: {},
    idx: { squadByClub: {}, contractByPlayer: {}, fixturesByDay: {}, fixturesByCompetition: {} },
  };
}

export function nextId(world: World, prefix: string, width = 5): string {
  const n = (world.counters[prefix] ?? 0) + 1;
  world.counters[prefix] = n;
  return `${prefix}_${String(n).padStart(width, '0')}`;
}

export function seasonDay(world: World): number { return world.day - world.seasonStartDay; }

export function squad(world: World, clubId: string): Player[] {
  return (world.idx.squadByClub[clubId] ?? []).map((id) => world.players[id]);
}

export function contractOf(world: World, playerId: string): Contract | null {
  const id = world.idx.contractByPlayer[playerId];
  return id ? world.contracts[id] ?? null : null;
}

export function leagueOf(world: World, clubId: string): CompetitionLeague | null {
  const club = world.clubs[clubId];
  const comp = world.competitions[club.leagueId];
  return comp && comp.kind === 'league' ? comp : null;
}

export function tierOfClub(world: World, clubId: string): number {
  const league = leagueOf(world, clubId);
  return league ? league.tier : 1;
}

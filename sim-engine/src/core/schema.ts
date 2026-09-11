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
  /** Three-letter nation code. */
  nationality: string;
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
  /** Asking price when the owning club has listed the player for sale; null otherwise. */
  listedAt: number | null;
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
  city: string;
  nationId: string;
  /** Tier code (e.g. ENG-T1) or the current league competition id. */
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
  nationId: string;
  season: number;
  tier: number;
  clubIds: string[];
  promote: number;
  relegate: number;
  complete: boolean;
}

export type CupKind = 'domestic' | 'leagueCup' | 'continental';

export interface CompetitionCup {
  id: string;
  kind: 'cup';
  cupKind: CupKind;
  name: string;
  /** Null for continental competitions. */
  nationId: string | null;
  season: number;
  clubIds: string[];
  alive: string[];
  /** Knockout round number; during a group stage this is 0. */
  round: number;
  totalRounds: number;
  /** Group stage, when the cup has one: groups of club ids and the number of group matchdays. */
  groups: string[][] | null;
  groupRounds: number;
  stage: 'groups' | 'knockout';
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

/** A half-time substitution. Minute is always 46 for now. */
export interface MatchSub {
  clubId: string;
  offId: string;
  onId: string;
  minute: number;
}

export interface MatchReport {
  homeXI: string[];
  awayXI: string[];
  homeFormation: string;
  awayFormation: string;
  /** Pre-match expected goals over 90 minutes. */
  lambda: { home: number; away: number };
  factors: { home: GoalFactor[]; away: GoalFactor[] };
  /** Set when the second half was played on a different basis (a half-time change). */
  second: { lambda: { home: number; away: number }; factors: { home: GoalFactor[]; away: GoalFactor[] } } | null;
  goals: GoalEvent[];
  penalties: { home: number; away: number } | null;
  attendance: number;
  /** Score after 45 minutes. */
  halfTimeScore: { home: number; away: number };
  subs: MatchSub[];
  /** Tactic switched at half time, when one was. */
  tacticChange: { clubId: string; from: Tactic; to: Tactic } | null;
}

/* ---------- the boardroom: money and decisions away from the team ---------- */

export type DecisionKind =
  | 'sponsor' | 'stadium' | 'academy' | 'medical' | 'scouting'
  | 'tickets' | 'bonus' | 'agent_fee' | 'debt' | 'community';

export interface DecisionOption {
  id: string;
  label: string;
  /** What it does, in the manager's words. */
  detail: string;
  /** One-off cost in k; negative means money in. */
  cost?: number;
  /** Change to the weekly ledger in k; positive is income. */
  weekly?: number;
  /** Facility this option upgrades, if any. */
  upgrade?: keyof Facilities;
  /** Seats added once the work finishes. */
  seats?: number;
  /** Weeks until the work finishes. */
  weeks?: number;
  /** Change to the ticket price multiplier. */
  ticketDelta?: number;
  /** Borrowed amount in k, repaid weekly. */
  borrow?: number;
  /** Effect on board confidence, in target places. */
  boardMood?: number;
}

export interface Decision {
  id: string;
  kind: DecisionKind;
  day: number;
  /** Lapses if it is not answered by this day. */
  expiresDay: number;
  title: string;
  body: string;
  /** Set when the money only moves if the manager says yes. */
  approval: boolean;
  options: DecisionOption[];
  /** Option id, once answered; 'lapsed' if it timed out. */
  chosen: string | null;
  chosenDay: number | null;
}

export interface Facilities {
  /** 1-5. Bigger stands, better academy, better treatment, wider scouting. */
  stadium: number;
  academy: number;
  medical: number;
  scouting: number;
}

export interface Sponsor {
  name: string;
  weekly: number;
  untilSeason: number;
}

export interface Project {
  id: string;
  label: string;
  endDay: number;
  seats: number;
  upgrade: keyof Facilities | null;
}

/** Everything the human manager signs off on, away from the pitch. */
export interface Boardroom {
  clubId: string;
  facilities: Facilities;
  sponsor: Sponsor | null;
  /** Multiplies the gate price. 1 is the going rate. */
  ticketLevel: number;
  /** Outstanding loan in k. */
  debt: number;
  /** Weekly repayment in k. */
  repayment: number;
  projects: Project[];
  decisions: Decision[];
}

/**
 * A match of the human manager's paused at half time. Lives in the world so it
 * survives a save and reload; cleared when the match is finished.
 */
export interface HalfTimeState {
  fixtureId: string;
  /** The human manager's club. */
  clubId: string;
  homeXI: string[];
  awayXI: string[];
  homeFormation: string;
  awayFormation: string;
  homeTactic: Tactic;
  awayTactic: Tactic;
  lambda: { home: number; away: number };
  factors: { home: GoalFactor[]; away: GoalFactor[] };
  goals: GoalEvent[];
  homeGoals: number;
  awayGoals: number;
  attendance: number;
  /** Fixtures of the same day still to play once the match resumes. */
  remainingFixtureIds: string[];
}

export interface Fixture {
  id: string;
  competitionId: string;
  season: number;
  round: number;
  day: number;
  homeClubId: string;
  awayClubId: string;
  /** Group index for group-stage fixtures. */
  group: number | null;
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
  /** Final league position per club. */
  positions: Record<string, number>;
  /** End-of-season awards, filled by AWARDS_GIVEN. */
  awards: { title: string; nationId: string | null; playerId: string | null; clubId: string | null; managerId: string | null; detail: string }[];
}

export interface Indexes {
  squadByClub: Record<string, string[]>;
  contractByPlayer: Record<string, string>;
  fixturesByDay: Record<number, string[]>;
  fixturesByCompetition: Record<string, string[]>;
}

export interface Nation {
  id: string;
  name: string;
  adjective: string;
  tiers: number[];
  leagueNames: string[];
  cupName: string;
  leagueCupName: string | null;
  coefficient: number;
  continentalSlots: number;
  currency: string;
}

export type NewsCategory = 'transfer' | 'rumour' | 'bid' | 'contract' | 'manager' | 'injury' | 'match' | 'board' | 'award' | 'record' | 'cup';

export interface NewsItem {
  id: string;
  day: number;
  season: number;
  category: NewsCategory;
  headline: string;
  body: string;
  clubIds: string[];
  playerId: string | null;
  nationId: string | null;
}

export interface TransferBid {
  id: string;
  day: number;
  playerId: string;
  fromClubId: string;
  toClubId: string;
  fee: number;
  /** Day the bid lapses if unanswered. */
  expiresDay: number;
}

export interface WorldConfig {
  seed: string;
  /** 'real' builds the real-world dataset; 'custom' generates fictional nations. */
  world: 'real' | 'custom';
  /** Nations to include in real mode (ENG, ESP, GER, ITA, FRA). */
  nations: string[];
  /** Custom mode: tiers and clubs per tier for the single fictional nation. */
  leagues: number;
  clubsPerLeague: number;
  squadSize: number;
  seasonLength: number;
  cup: boolean;
  /** Continental cup for the top clubs of each nation. */
  continental: boolean;
}

export interface World {
  config: WorldConfig;
  seed: string;
  day: number;
  season: number;
  seasonStartDay: number;
  seasonLength: number;
  nations: Record<string, Nation>;
  players: Record<string, Player>;
  clubs: Record<string, Club>;
  managers: Record<string, Manager>;
  contracts: Record<string, Contract>;
  competitions: Record<string, Competition>;
  fixtures: Record<string, Fixture>;
  transfers: TransferRecord[];
  news: NewsItem[];
  pendingBids: TransferBid[];
  freeAgents: string[];
  history: SeasonSummary[];
  counters: Record<string, number>;
  idx: Indexes;
  /** Club controlled by a human manager, if any. */
  humanClubId: string | null;
  /** The human's manager record, kept across sackings and moves. */
  humanManagerId: string | null;
  /** Set when the human manager loses the job. */
  careerOver: { day: number; season: number; reason: string } | null;
  /** The human's match paused at half time, if one is. */
  halfTime: HalfTimeState | null;
  /** The human manager's boardroom, once they take a job. */
  boardroom: Boardroom | null;
}

export const DEFAULT_CONFIG: WorldConfig = {
  seed: 'default',
  world: 'real',
  nations: ['ENG', 'ESP', 'GER', 'ITA', 'FRA'],
  leagues: 2,
  clubsPerLeague: 12,
  squadSize: 25,
  seasonLength: 364,
  cup: true,
  continental: true,
};

/** Small fictional world used by tests and quick runs. */
export const CUSTOM_CONFIG: WorldConfig = { ...DEFAULT_CONFIG, world: 'custom', nations: ['CUS'], continental: false, squadSize: 24 };

export function createEmptyWorld(config: WorldConfig): World {
  return {
    config,
    seed: config.seed,
    day: -1,
    season: 1,
    seasonStartDay: 0,
    seasonLength: config.seasonLength,
    nations: {},
    players: {},
    clubs: {},
    managers: {},
    contracts: {},
    competitions: {},
    fixtures: {},
    transfers: [],
    news: [],
    pendingBids: [],
    freeAgents: [],
    history: [],
    counters: {},
    idx: { squadByClub: {}, contractByPlayer: {}, fixturesByDay: {}, fixturesByCompetition: {} },
    humanClubId: null,
    humanManagerId: null,
    careerOver: null,
    halfTime: null,
    boardroom: null,
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
  return league ? league.tier : tierFromLeagueId(world.clubs[clubId].leagueId);
}

/** Tier code used on clubs between seasons, e.g. ENG-T2. */
export function tierCode(nationId: string, tier: number): string { return `${nationId}-T${tier}`; }
export function tierFromLeagueId(id: string): number {
  const m = /-T(\d+)/.exec(id);
  return m ? Number(m[1]) : 1;
}
export function nationFromLeagueId(id: string): string {
  const m = /^([A-Z]+)-/.exec(id);
  return m ? m[1] : 'CUS';
}
export function isRealWorld(world: World): boolean { return world.config.world === 'real'; }
export function bottomTier(world: World, nationId: string): number { return world.nations[nationId]?.tiers.length ?? world.config.leagues; }

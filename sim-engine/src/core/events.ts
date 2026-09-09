import type {
  Attributes, Club, Competition, Contract, Fixture, Manager, MatchReport, Player, SeasonSummary, Tactic, TransferRecord, WorldConfig,
} from './schema.js';

export interface PlayerMatchStats {
  minutes: number;
  goals: number;
  assists: number;
  rating: number;
  fitnessDelta: number;
}

export interface FinanceEntry { clubId: string; category: string; amount: number }

export interface EventPayloads {
  WORLD_CREATED: { seed: string; config: WorldConfig };
  CLUB_CREATED: { club: Club };
  PLAYER_CREATED: { player: Player };
  MANAGER_CREATED: { manager: Manager };
  CONTRACT_SIGNED: { contract: Contract; record: TransferRecord | null };
  CONTRACT_EXPIRED: { contractId: string; playerId: string; clubId: string };
  COMPETITION_CREATED: { competition: Competition };
  FIXTURES_SCHEDULED: { fixtures: Fixture[] };
  SEASON_STARTED: { season: number; startDay: number };
  DAY_ADVANCED: { day: number };
  MATCH_PLAYED: {
    fixtureId: string;
    homeGoals: number;
    awayGoals: number;
    winnerId: string | null;
    report: MatchReport;
    playerStats: Record<string, PlayerMatchStats>;
  };
  PLAYER_INJURED: { playerId: string; days: number };
  MORALE_CHANGED: { deltas: Record<string, number>; reason: string };
  FINANCE_POSTED: { entries: FinanceEntry[] };
  PLAYER_DEVELOPED: { deltas: Record<string, Partial<Attributes>> };
  PLAYER_VALUED: { values: Record<string, number> };
  PLAYER_TRANSFERRED: { record: TransferRecord; contract: Contract };
  LOAN_STARTED: { record: TransferRecord; returnSeason: number };
  LOAN_RETURNED: { record: TransferRecord };
  PLAYER_RETIRED: { playerId: string; clubId: string | null; reason: 'age' | 'unattached' };
  MANAGER_SACKED: { managerId: string; clubId: string; reason: string };
  MANAGER_APPOINTED: { managerId: string; clubId: string; contractEndSeason: number };
  MANAGER_CONTRACT_EXPIRED: { managerId: string; clubId: string };
  CUP_ROUND_ADVANCED: { competitionId: string; round: number; alive: string[]; winnerId: string | null };
  BUDGETS_SET: { budgets: Record<string, { wageBudget: number; transferBudget: number; boardTarget: number }> };
  TACTIC_CHANGED: { clubId: string; tactic: Tactic };
  SEASON_ENDED: { season: number; summary: SeasonSummary; leagueMoves: Record<string, string> };
  PLAYERS_AGED: { season: number };
}

export type EventType = keyof EventPayloads;

export type Event<T extends EventType = EventType> = T extends EventType
  ? { type: T; day: number; payload: EventPayloads[T] }
  : never;

export function makeEvent<T extends EventType>(type: T, day: number, payload: EventPayloads[T]): Event<T> {
  return { type, day, payload } as Event<T>;
}

export function countEventTypes(events: readonly Event[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

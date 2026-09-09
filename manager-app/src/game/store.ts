'use client';
/**
 * Career persistence. Local careers live in IndexedDB (no account needed);
 * cloud careers go through the API, which enforces plan limits.
 */
import type { GameSnapshot } from 'sim-engine';

export interface InboxItem { day: number; season: number; text: string }

export interface CareerSummary {
  tier: number;
  position: number;
  balance: number;
  careerOver: boolean;
  /** Recent inbox items and the fixture ids of the last matchday, restored on load. */
  inbox?: InboxItem[];
  lastResults?: string[];
}

export interface CareerMeta {
  id: string;
  name: string;
  managerName: string;
  clubId: string;
  clubName: string;
  seed: string;
  season: number;
  day: number;
  updatedAt: string;
  summary: CareerSummary;
  storage: 'local' | 'cloud';
}

export interface CareerRecord extends CareerMeta {
  snapshot: GameSnapshot;
}

export class StoreError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

const DB = 'touchline';
const STORE = 'careers';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export const local = {
  async list(): Promise<CareerMeta[]> {
    if (typeof indexedDB === 'undefined') return [];
    const all = await tx<CareerRecord[]>('readonly', (s) => s.getAll() as IDBRequest<CareerRecord[]>);
    return all.map(({ snapshot: _s, ...meta }) => ({ ...meta, storage: 'local' as const })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async get(id: string): Promise<CareerRecord | null> {
    const r = await tx<CareerRecord | undefined>('readonly', (s) => s.get(id) as IDBRequest<CareerRecord | undefined>);
    return r ? { ...r, storage: 'local' } : null;
  },
  async put(record: CareerRecord): Promise<void> {
    await tx('readwrite', (s) => s.put({ ...record, storage: 'local' }));
  },
  async remove(id: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(id));
  },
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string } & T;
  if (!res.ok) throw new StoreError(body.error ?? `http_${res.status}`, body.message ?? `Request failed (${res.status})`);
  return body;
}

interface CloudRow {
  id: string; name: string; manager_name: string; club_id: string; club_name: string; seed: string;
  season: number; day: number; summary: CareerSummary; updated_at: string; state?: GameSnapshot;
}

const fromRow = (r: CloudRow): CareerMeta => ({
  id: r.id, name: r.name, managerName: r.manager_name, clubId: r.club_id, clubName: r.club_name, seed: r.seed,
  season: r.season, day: r.day, updatedAt: r.updated_at, summary: r.summary, storage: 'cloud',
});

export const cloud = {
  async list(): Promise<{ careers: CareerMeta[]; plan: 'free' | 'pro'; maxCareers: number; maxSeasons: number }> {
    const body = await call<{ careers: CloudRow[]; plan: 'free' | 'pro'; limits: { maxCareers: number; maxSeasons: number } }>('/api/careers');
    return { careers: body.careers.map(fromRow), plan: body.plan, maxCareers: body.limits.maxCareers, maxSeasons: body.limits.maxSeasons };
  },
  async get(id: string): Promise<CareerRecord> {
    const body = await call<{ career: CloudRow & { state: GameSnapshot } }>(`/api/careers/${id}`);
    return { ...fromRow(body.career), snapshot: body.career.state };
  },
  async create(record: Omit<CareerRecord, 'id' | 'storage' | 'updatedAt'>): Promise<string> {
    const body = await call<{ id: string }>('/api/careers', {
      method: 'POST',
      body: JSON.stringify({ name: record.name, managerName: record.managerName, clubId: record.clubId, clubName: record.clubName, seed: record.seed, season: record.season, day: record.day, summary: record.summary, state: record.snapshot }),
    });
    return body.id;
  },
  async update(record: CareerRecord): Promise<void> {
    await call(`/api/careers/${record.id}`, { method: 'PUT', body: JSON.stringify({ season: record.season, day: record.day, summary: record.summary, state: record.snapshot, name: record.name }) });
  },
  async remove(id: string): Promise<void> {
    await call(`/api/careers/${id}`, { method: 'DELETE' });
  },
};

export function newLocalId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isLocalId(id: string): boolean { return id.startsWith('local-'); }

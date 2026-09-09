import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Rng } from '../core/rng.js';
import { bergerRoundRobin, doubleRoundRobin } from '../matchday/fixtures.js';
import { computeTable } from '../matchday/table.js';
import { selectXI } from '../matchday/xi.js';
import { createWorld } from '../sim/runner.js';
import { DEFAULT_CONFIG } from '../core/schema.js';
import { checkInvariants } from '../sim/invariants.js';
import { contractLengthFor } from '../world/generate.js';

test('rng is deterministic for a seed and different across seeds', () => {
  const a = new Rng('seed-1'), b = new Rng('seed-1'), c = new Rng('seed-2');
  const xs = Array.from({ length: 5 }, () => a.next());
  const ys = Array.from({ length: 5 }, () => b.next());
  const zs = Array.from({ length: 5 }, () => c.next());
  assert.deepEqual(xs, ys);
  assert.notDeepEqual(xs, zs);
  for (const x of xs) assert.ok(x >= 0 && x < 1);
});

test('rng state round-trips', () => {
  const a = new Rng('x');
  a.next();
  const b = new Rng(a.state());
  assert.equal(a.next(), b.next());
});

test('berger round robin: every pair meets once, one match per team per round', () => {
  for (const n of [4, 7, 12, 20]) {
    const teams = Array.from({ length: n }, (_, i) => `t${i}`);
    const rounds = bergerRoundRobin(teams);
    assert.equal(rounds.length, n % 2 === 0 ? n - 1 : n);
    const pairs = new Set<string>();
    for (const round of rounds) {
      const seen = new Set<string>();
      for (const [h, a] of round) {
        assert.ok(!seen.has(h) && !seen.has(a), `team plays twice in a round (n=${n})`);
        seen.add(h); seen.add(a);
        const key = [h, a].sort().join('|');
        assert.ok(!pairs.has(key), `pair repeated (n=${n})`);
        pairs.add(key);
      }
    }
    assert.equal(pairs.size, (n * (n - 1)) / 2);
    const dbl = doubleRoundRobin(teams);
    const homeCount = new Map<string, number>();
    for (const round of dbl) for (const [h] of round) homeCount.set(h, (homeCount.get(h) ?? 0) + 1);
    for (const t of teams) assert.equal(homeCount.get(t), n - 1, `each team hosts n-1 times (n=${n})`);
  }
});

test('contract lengths are never zero', () => {
  const rng = new Rng('contracts');
  for (let i = 0; i < 500; i++) {
    const len = contractLengthFor(rng.int(16, 38), rng);
    assert.ok(len >= 1 && len <= 4, `length ${len}`);
  }
});

test('generated world passes invariants and selects a full XI', () => {
  const ctx = createWorld({ ...DEFAULT_CONFIG, seed: 'gen', leagues: 1, clubsPerLeague: 6 });
  const world = ctx.world;
  assert.deepEqual(checkInvariants(world), []);
  assert.equal(Object.keys(world.clubs).length, 6);
  for (const clubId of Object.keys(world.clubs)) {
    const sel = selectXI(world, clubId, 'balanced');
    assert.equal(sel.playerIds.length, 11);
    assert.equal(new Set(sel.playerIds).size, 11);
    assert.equal(sel.byPos.GK.length, 1);
  }
  for (const c of Object.values(world.contracts)) assert.ok(c.lengthSeasons >= 1);
});

test('league table orders by points, goal difference, goals for', () => {
  const ctx = createWorld({ ...DEFAULT_CONFIG, seed: 'table', leagues: 1, clubsPerLeague: 4 });
  const w = ctx.world;
  const ids = Object.keys(w.clubs);
  const comp = { id: 'LT', kind: 'league' as const, name: 'T', season: 1, tier: 1, clubIds: ids, promote: 0, relegate: 0, complete: false };
  w.competitions[comp.id] = comp;
  w.idx.fixturesByCompetition[comp.id] = [];
  const add = (h: string, a: string, hg: number, ag: number, i: number) => {
    const id = `fx${i}`;
    w.fixtures[id] = { id, competitionId: comp.id, season: 1, round: 1, day: i, homeClubId: h, awayClubId: a, knockout: false, played: true, homeGoals: hg, awayGoals: ag, winnerId: hg > ag ? h : ag > hg ? a : null, report: null };
    w.idx.fixturesByCompetition[comp.id].push(id);
  };
  add(ids[0], ids[1], 3, 0, 1); // 0 wins by 3
  add(ids[2], ids[3], 2, 1, 2); // 2 wins by 1
  add(ids[1], ids[3], 1, 1, 3); // draw
  const table = computeTable(w, comp);
  assert.equal(table[0].clubId, ids[0]);
  assert.equal(table[1].clubId, ids[2]);
  assert.equal(table[2].points, 1);
  assert.equal(table[3].points, 1);
});

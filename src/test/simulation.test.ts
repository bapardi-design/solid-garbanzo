import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../core/schema.js';
import { runSeasons } from '../sim/runner.js';
import { reduce } from '../core/reducer.js';
import { createEmptyWorld } from '../core/schema.js';
import { hashWorld } from '../sim/snapshot.js';
import { checkInvariants } from '../sim/invariants.js';

const small = { ...DEFAULT_CONFIG, seed: 'test-run', leagues: 2, clubsPerLeague: 6, squadSize: 20 };

test('two seasons run with invariants holding and plausible match stats', () => {
  const result = runSeasons({ config: small, seasons: 2, strict: true });
  assert.equal(result.seasons.length, 2);
  for (const s of result.seasons) {
    assert.deepEqual(s.invariantErrors, []);
    assert.equal(s.metrics.matches, 2 * 30 + 11); // two 6-club double round robins + 12-club cup
    assert.ok(s.metrics.goalsPerMatch > 1.8 && s.metrics.goalsPerMatch < 3.8, `goals ${s.metrics.goalsPerMatch}`);
    assert.ok(s.metrics.avgContractLength >= 1);
    assert.equal(s.metrics.eventCounts.SEASON_ENDED, 1);
  }
  assert.equal(result.world.history.length, 2);
  assert.ok(result.world.history[0].promoted.length > 0);
  assert.equal(result.world.history[0].promoted.length, result.world.history[0].relegated.length);
  for (const comp of Object.values(result.world.competitions)) {
    if (comp.kind === 'cup') assert.ok(comp.complete && comp.winnerId, `cup ${comp.id} finished`);
  }
});

test('same seed reproduces the same hash; event replay rebuilds the same state', () => {
  const a = runSeasons({ config: small, seasons: 1, strict: true, keepEvents: true });
  const b = runSeasons({ config: small, seasons: 1, strict: true });
  assert.equal(a.seasons[0].hash, b.seasons[0].hash);
  const replayed = createEmptyWorld(small);
  for (const e of a.events) reduce(replayed, e);
  assert.deepEqual(checkInvariants(replayed), []);
  assert.equal(hashWorld(replayed), a.seasons[0].hash);
});

test('different seeds diverge', () => {
  const a = runSeasons({ config: small, seasons: 1 });
  const b = runSeasons({ config: { ...small, seed: 'other' }, seasons: 1 });
  assert.notEqual(a.seasons[0].hash, b.seasons[0].hash);
});

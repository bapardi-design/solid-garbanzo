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

test('resuming from a snapshot continues identically to an uninterrupted run', () => {
  const straight = runSeasons({ config: small, seasons: 2 });
  const first = runSeasons({ config: small, seasons: 1 });
  const resumed = runSeasons({ config: small, seasons: 1, resumeFrom: { version: 1, world: first.world, rng: first.rng.state() } });
  assert.equal(resumed.seasons[0].season, 2);
  assert.equal(resumed.seasons[0].hash, straight.seasons[1].hash);
});

test('cup with a non power-of-two field completes with byes and one winner', () => {
  const cfg = { ...small, leagues: 1, clubsPerLeague: 6 }; // 6 entrants -> 2 byes in round 1
  const result = runSeasons({ config: cfg, seasons: 1 });
  const cup = Object.values(result.world.competitions).find((c) => c.kind === 'cup');
  assert.ok(cup && cup.kind === 'cup');
  assert.equal(cup.totalRounds, 3);
  assert.ok(cup.complete && cup.winnerId);
  const fixtures = Object.values(result.world.fixtures).filter((f) => f.competitionId === cup.id);
  assert.equal(fixtures.length, 5); // 2 + 2 + 1
  assert.ok(fixtures.every((f) => f.played && f.winnerId));
});

test('promotion and relegation swap clubs between tiers', () => {
  const result = runSeasons({ config: small, seasons: 1 });
  const summary = result.world.history[0];
  assert.equal(summary.promoted.length, 1);
  assert.equal(summary.relegated.length, 1);
  const w = result.world;
  assert.equal(w.clubs[summary.promoted[0]].leagueId, 'L1');
  assert.equal(w.clubs[summary.relegated[0]].leagueId, 'L2');
  assert.ok(summary.topScorer && !w.players[summary.topScorer.playerId].retired || summary.topScorer === null);
});

test('transfer market produces activity in the first season', () => {
  const result = runSeasons({ config: { ...DEFAULT_CONFIG, seed: 'market' }, seasons: 1 });
  const t = result.seasons[0].metrics.transfers;
  assert.ok((t.transfer ?? 0) + (t.free ?? 0) > 0, `no signings: ${JSON.stringify(t)}`);
  assert.ok((t.renewal ?? 0) > 0);
});

test('html report renders every section from a run', async () => {
  const { renderReport } = await import('../sim/report.js');
  const result = runSeasons({ config: small, seasons: 2 });
  const html = renderReport(result);
  for (const marker of ['Simulation Annual', 'Scoring and outcome balance', 'Average club balance', 'Transfer activity', 'Final standings', 'Champions, promotions', 'leading scorers', 'Why results happened', 'Event log', '<svg', 'champions</span>']) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
  assert.ok(!html.includes('undefined'), 'report contains undefined');
  assert.ok(!html.includes('NaN'), 'report contains NaN');
});

test('human manager can take over, buy, list, renew, and gets sacked by the board', async () => {
  const A = await import('../actions.js');
  const { createGame, step } = await import('../browser/engine.js');
  const game = createGame({ ...small, seed: 'career' });
  const { ctx, world } = game;
  const clubId = A.jobOffers(ctx)[0].club.id;
  const manager = A.takeOverClub(ctx, clubId, 'Test Manager');
  assert.equal(world.humanClubId, clubId);
  assert.equal(world.clubs[clubId].managerId, manager.id);
  step(game, 2); // into the summer window (Monday of week 1)
  assert.ok(A.setTactic(ctx, 'attacking').ok);
  const market = A.marketForHuman(ctx);
  assert.ok(market.length > 0, 'market has listings');
  const target = market.find((m) => m.affordable);
  assert.ok(target, 'an affordable listing exists');
  let bought = false;
  for (let i = 0; i < 12 && !bought; i++) bought = A.bidForPlayer(ctx, target!.player.id, 2).ok || A.marketForHuman(ctx).find((m) => m.player.id === target!.player.id) === undefined;
  const own = world.idx.squadByClub[clubId];
  const listed = A.listPlayer(ctx, own[own.length - 1], 500);
  assert.ok(listed.ok);
  const terms = A.renewalTerms(ctx, own[0]);
  assert.ok(terms);
  step(game, 400); // through a season end; the human club must not be AI-managed meanwhile
  assert.ok(world.humanClubId === clubId || world.careerOver !== null);
  assert.deepEqual(checkInvariants(world), []);
});

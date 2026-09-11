import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CUSTOM_CONFIG } from '../core/schema.js';
import { checkInvariants } from '../sim/invariants.js';

const small = { ...CUSTOM_CONFIG, leagues: 2, clubsPerLeague: 8, squadSize: 20 };

/** Plays until the human's match pauses at half time. */
async function pausedGame(seed: string) {
  const { createGame, step } = await import('../browser/engine.js');
  const A = await import('../actions.js');
  const game = createGame({ ...small, seed });
  A.takeOverClub(game.ctx, A.jobOffers(game.ctx)[0].club.id, 'Gaffer');
  for (let i = 0; i < 60 && !game.world.halfTime; i++) step(game, 1, { halfTime: true });
  assert.ok(game.world.halfTime, 'a match paused at half time');
  return { game, A };
}

test('the human match pauses at half time and the fixture is still unplayed', async () => {
  const { game, A } = await pausedGame('ht-pause');
  const view = A.halfTimeView(game.world);
  assert.ok(view);
  const fixture = game.world.fixtures[view.fixtureId];
  assert.equal(fixture.played, false);
  assert.equal(view.mine.xi.length, 11);
  assert.ok(view.mine.bench.length > 0, 'somebody is on the bench');
  assert.ok(view.homeGoals >= 0 && view.awayGoals >= 0);
  assert.equal(view.goals.length, view.homeGoals + view.awayGoals);
  for (const g of view.goals) assert.ok(g.minute >= 1 && g.minute <= 45, 'first-half goals only');
  // The day has not finished: no fixture of the human's is resolved yet.
  assert.ok(!game.world.fixtures[view.fixtureId].report);
});

test('half time survives a save and reload, and the second half finishes the day', async () => {
  const { game, A } = await pausedGame('ht-save');
  const { snapshotGame, resumeGame, resumeHalfTime } = await import('../browser/engine.js');
  const view = A.halfTimeView(game.world)!;
  const reloaded = resumeGame(snapshotGame(game));
  const view2 = A.halfTimeView(reloaded.world);
  assert.deepEqual(view2, view, 'the paused match is restored exactly');

  const off = view.mine.xi[view.mine.xi.length - 1].playerId;
  const on = view.mine.bench[0];
  const day = reloaded.world.day;
  resumeHalfTime(reloaded, { tactic: 'attacking', subs: [{ offId: off, onId: on }] });

  const fixture = reloaded.world.fixtures[view.fixtureId];
  assert.equal(fixture.played, true);
  assert.equal(reloaded.world.halfTime, null);
  assert.equal(reloaded.world.day, day, 'resuming finishes the same day');
  const report = fixture.report!;
  assert.deepEqual(report.halfTimeScore, { home: view.homeGoals, away: view.awayGoals });
  assert.equal(report.subs.length, 1);
  assert.deepEqual(report.subs[0], { clubId: view.mine.clubId, offId: off, onId: on, minute: 46 });
  assert.ok(report.tacticChange, 'the tactic switch is recorded');
  assert.equal(report.tacticChange!.to, 'attacking');
  assert.ok(report.second, 'the second half ran on a new basis');
  assert.equal(fixture.homeGoals + fixture.awayGoals, report.goals.length);
  assert.ok(fixture.homeGoals >= view.homeGoals && fixture.awayGoals >= view.awayGoals);
  assert.deepEqual(checkInvariants(reloaded.world), []);
});

test('substitute plays 45 minutes, an ever-present plays 90', async () => {
  const { game, A } = await pausedGame('ht-minutes');
  const { resumeHalfTime } = await import('../browser/engine.js');
  const view = A.halfTimeView(game.world)!;
  const off = view.mine.xi[view.mine.xi.length - 1].playerId;
  const on = view.mine.bench[0];
  const kept = view.mine.xi[0].playerId;
  const before = {
    off: game.world.players[off].stats.minutes,
    on: game.world.players[on].stats.minutes,
    kept: game.world.players[kept].stats.minutes,
  };
  resumeHalfTime(game, { subs: [{ offId: off, onId: on }] });
  assert.equal(game.world.players[off].stats.minutes - before.off, 45);
  assert.equal(game.world.players[on].stats.minutes - before.on, 45);
  assert.equal(game.world.players[kept].stats.minutes - before.kept, 90);
});

test('the same half-time decision always gives the same match', async () => {
  const run = async () => {
    const { game, A } = await pausedGame('ht-determinism');
    const { resumeHalfTime } = await import('../browser/engine.js');
    const view = A.halfTimeView(game.world)!;
    resumeHalfTime(game, { tactic: 'defensive' });
    const f = game.world.fixtures[view.fixtureId];
    return { home: f.homeGoals, away: f.awayGoals, goals: f.report!.goals };
  };
  assert.deepEqual(await run(), await run());
});

test('illegal substitutions are ignored', async () => {
  const { game, A } = await pausedGame('ht-illegal');
  const { resumeHalfTime } = await import('../browser/engine.js');
  const view = A.halfTimeView(game.world)!;
  const onPitch = view.mine.xi[0].playerId;
  resumeHalfTime(game, {
    subs: [
      { offId: 'nobody', onId: view.mine.bench[0] },
      { offId: view.mine.xi[1].playerId, onId: onPitch },
      { offId: view.mine.xi[2].playerId, onId: 'ghost' },
    ],
  });
  assert.deepEqual(game.world.fixtures[view.fixtureId].report!.subs, []);
});

test('a save written before half-time existed still loads and replays', async () => {
  const { createGame, step, snapshotGame, resumeGame } = await import('../browser/engine.js');
  const A = await import('../actions.js');
  const game = createGame({ ...small, seed: 'old-save' });
  A.takeOverClub(game.ctx, A.jobOffers(game.ctx)[0].club.id, 'Gaffer');
  step(game, 40);
  const snap = snapshotGame(game);
  // Strip the fields an older build would not have written.
  const legacy = JSON.parse(JSON.stringify(snap));
  delete legacy.world.halfTime;
  let played = 0;
  for (const f of Object.values(legacy.world.fixtures) as { report: Record<string, unknown> | null }[]) {
    const r = f.report;
    if (!r) continue;
    played++;
    delete r.halfTimeScore; delete r.subs; delete r.second; delete r.tacticChange;
  }
  assert.ok(played > 0, 'the old save has played fixtures');

  const restored = resumeGame(legacy);
  assert.equal(restored.world.halfTime, null);
  const sample = Object.values(restored.world.fixtures).find((f) => f.report);
  const r = sample!.report!;
  assert.deepEqual(r.subs, []);
  assert.equal(r.second, null);
  assert.deepEqual(r.halfTimeScore, {
    home: r.goals.filter((g) => g.minute <= 45 && g.clubId === sample!.homeClubId).length,
    away: r.goals.filter((g) => g.minute <= 45 && g.clubId === sample!.awayClubId).length,
  });
  step(restored, 5);
  assert.deepEqual(checkInvariants(restored.world), []);
});

test('the second-half eleven is rebuilt into the same slots it started in', async () => {
  const { createGame } = await import('../browser/engine.js');
  const { selectXI } = await import('../matchday/xi.js');
  const { selectionFromIds } = await import('../matchday/match.js');
  const game = createGame({ ...small, seed: 'rebuild' });
  const world = game.world;
  for (const clubId of Object.keys(world.clubs)) {
    for (const tactic of ['balanced', 'attacking', 'defensive'] as const) {
      const sel = selectXI(world, clubId, tactic);
      assert.deepEqual(selectionFromIds(world, sel.playerIds, sel.formation, tactic), sel, `${clubId} ${tactic}`);
    }
  }
});

test('the boardroom opens with the club and puts decisions on the desk', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const A = await import('../actions.js');
  const game = createGame({ ...small, seed: 'boardroom' });
  const clubId = A.jobOffers(game.ctx)[0].club.id;
  A.takeOverClub(game.ctx, clubId, 'Chairman Whisperer');
  const opened = A.boardroomView(game.world);
  assert.ok(opened, 'a boardroom exists once you have a club');
  assert.equal(opened.clubId, clubId);
  assert.ok(opened.facilities.length === 4);
  assert.ok(opened.lines.some((l) => l.weekly < 0), 'wages are money out');

  for (let i = 0; i < 60 && A.boardroomView(game.world)!.pending.length === 0; i++) step(game, 1);
  const view = A.boardroomView(game.world)!;
  assert.ok(view.pending.length > 0, 'something lands on the desk within a couple of months');
  const d = view.pending[0];
  assert.ok(d.options.length >= 2 && d.title && d.body);
});

test('answering a decision moves the money and cannot be answered twice', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const A = await import('../actions.js');
  const game = createGame({ ...small, seed: 'decide' });
  const clubId = A.jobOffers(game.ctx)[0].club.id;
  A.takeOverClub(game.ctx, clubId, 'Gaffer');
  for (let i = 0; i < 60 && A.boardroomView(game.world)!.pending.length === 0; i++) step(game, 1);
  const d = A.boardroomView(game.world)!.pending[0];
  const paid = d.options.find((o) => (o.cost ?? 0) > 0);
  const before = game.world.clubs[clubId].balance;
  const chosen = paid ?? d.options[0];
  const res = A.decide(game.ctx, d.id, chosen.id);
  assert.ok(res.ok, res.message);
  if (paid) assert.ok(game.world.clubs[clubId].balance < before, 'the cost came out of the bank');
  assert.equal(A.decide(game.ctx, d.id, chosen.id).ok, false, 'it cannot be answered twice');
  assert.equal(A.boardroomView(game.world)!.pending.find((x) => x.id === d.id), undefined);
  assert.ok(A.boardroomView(game.world)!.settled.some((x) => x.id === d.id));
  assert.deepEqual(checkInvariants(game.world), []);
});

test('a ticket rise lifts the gate and thins the crowd', async () => {
  const { createGame } = await import('../browser/engine.js');
  const B = await import('../engines/boardroom.js');
  const A = await import('../actions.js');
  const game = createGame({ ...small, seed: 'tickets' });
  const clubId = A.jobOffers(game.ctx)[0].club.id;
  A.takeOverClub(game.ctx, clubId, 'Gaffer');
  assert.equal(B.ticketFactor(game.world, clubId), 1);
  assert.equal(B.attendanceFactor(game.world, clubId), 1);
  game.world.boardroom!.ticketLevel = 1.2;
  assert.ok(B.ticketFactor(game.world, clubId) > 1);
  assert.ok(B.attendanceFactor(game.world, clubId) < 1, 'dearer tickets mean a smaller crowd');
});

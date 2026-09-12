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

test('cards are shown, sendings-off are banned, and nobody is booked after going off', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const game = createGame({ ...small, seed: 'discipline' });
  step(game, 200);
  const fixtures = Object.values(game.world.fixtures).filter((f) => f.played && f.report);
  assert.ok(fixtures.length > 20, 'matches were played');
  assert.ok(fixtures.flatMap((f) => f.report!.cards).length > 0, 'bookings happen');
  for (const f of fixtures) {
    const off = new Set<string>();
    for (const c of f.report!.cards) {
      assert.ok(c.minute >= 1 && c.minute <= 90);
      assert.ok([f.homeClubId, f.awayClubId].includes(c.clubId));
      if (c.kind === 'yellow') assert.equal(c.ban, 0);
      else assert.ok(c.ban >= 1, 'a sending-off carries a ban');
      assert.ok(!off.has(c.playerId), 'nobody is booked after being sent off');
      if (c.kind !== 'yellow') off.add(c.playerId);
    }
  }
  assert.ok(Object.values(game.world.players).some((p) => p.suspension > 0 || p.stats.reds > 0), 'bans are handed out');
});

test('a banned player cannot be picked', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { selectXI } = await import('../matchday/xi.js');
  const game = createGame({ ...small, seed: 'banned' });
  step(game, 200);
  const banned = Object.values(game.world.players).find((p) => p.suspension > 0 && p.clubId);
  assert.ok(banned, 'somebody is serving a ban');
  assert.ok(!selectXI(game.world, banned!.clubId!, 'balanced').playerIds.includes(banned!.id), 'the banned player is left out');
});

test('clubs from the same city play a derby', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { isDerby } = await import('../matchday/match.js');
  const { DEFAULT_CONFIG } = await import('../core/schema.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'derby', nations: ['ENG'] });
  step(game, 1); // the fixture list is drawn when the season starts
  const derbies = Object.values(game.world.fixtures).filter((f) => isDerby(game.world, f));
  assert.ok(derbies.length > 0, 'England has same-city fixtures');
  for (const f of derbies) assert.equal(game.world.clubs[f.homeClubId].city, game.world.clubs[f.awayClubId].city);
});

test('a player sent off takes no further part in the match', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const game = createGame({ ...small, seed: 'sent-off' });
  step(game, 400);
  let checked = 0;
  for (const f of Object.values(game.world.fixtures)) {
    const r = f.report;
    if (!r) continue;
    for (const c of r.cards) {
      if (c.kind === 'yellow') continue;
      checked++;
      for (const g of r.goals) {
        if (g.minute > c.minute) assert.notEqual(g.scorerId, c.playerId, 'a man already off cannot score');
      }
      assert.ok(r.cards.filter((x) => x.playerId === c.playerId && x.minute > c.minute).length === 0, 'no further cards for him');
    }
  }
  assert.ok(checked > 0, 'somebody was sent off');
});

test('the board never proposes a stand the club could not pay for', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const A = await import('../actions.js');
  const game = createGame({ ...small, seed: 'stands' });
  const clubId = A.jobOffers(game.ctx)[0].club.id;
  A.takeOverClub(game.ctx, clubId, 'Gaffer');
  let seen = 0;
  for (let i = 0; i < 250; i++) {
    step(game, 1);
    const view = A.boardroomView(game.world);
    if (!view) continue;
    for (const d of view.pending) {
      for (const o of d.options) {
        assert.ok((o.cost ?? 0) <= game.world.clubs[clubId].balance, `${d.kind} option ${o.id} costs ${o.cost} against a bank of ${game.world.clubs[clubId].balance}`);
        if (d.kind === 'stadium' && o.seats) {
          seen++;
          const perSeat = (o.cost ?? 0) / o.seats;
          assert.ok(perSeat >= 1 && perSeat <= 20, `a seat costs ${perSeat}k`);
        }
      }
    }
  }
  assert.ok(seen > 0, 'a stand was offered at some point');
});

test('a top-flight club does not simply bank its income', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { DEFAULT_CONFIG, tierOfClub } = await import('../core/schema.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'books', nations: ['ENG'] });
  const books = new Map<string, number>();
  const add = (cat: string, amt: number) => books.set(cat, (books.get(cat) ?? 0) + amt);
  for (let d = 0; d < 400; d++) {
    for (const e of step(game, 1)) {
      if (e.type !== 'FINANCE_POSTED') continue;
      for (const entry of e.payload.entries) {
        if (tierOfClub(game.world, entry.clubId) !== 1) continue;
        add(entry.category, entry.amount);
      }
    }
    if (game.world.day % game.world.seasonLength === game.world.seasonLength - 1) break;
  }
  const income = [...books.entries()].filter(([, v]) => v > 0).reduce((s, [, v]) => s + v, 0);
  const wages = -(books.get('wages') ?? 0);
  const net = [...books.values()].reduce((a, b) => a + b, 0);
  assert.ok(income > 0, 'the division earns something');
  // Wages are most of the money a real club takes, and what is left over is a
  // margin, not a second income. Without this the top flight banks a fortune
  // every year and the transfer market inflates out of reach.
  assert.ok(wages / income > 0.35 && wages / income < 0.75, `wages are ${(100 * wages / income).toFixed(0)}% of income`);
  assert.ok(net / income < 0.3, `the division keeps ${(100 * net / income).toFixed(0)}% of what it earns`);
});

test('squads do not waste away over a career', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { DEFAULT_CONFIG, squad } = await import('../core/schema.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'demography', nations: ['ENG', 'ESP'] });
  const sizes: number[] = [];
  for (let season = 0; season < 4; season++) {
    for (let d = 0; d < 400; d++) {
      step(game, 1);
      if (game.world.day % game.world.seasonLength === game.world.seasonLength - 1) break;
    }
    const all = Object.values(game.world.clubs).map((c) => squad(game.world, c.id).length);
    sizes.push(all.reduce((a, b) => a + b, 0) / all.length);
    step(game, 1);
  }
  // Youth intakes have to replace what age takes out. When they did not, clubs
  // lost a player a season until they were naming sixteen-man matchday squads.
  //
  // This asserts the level rather than the fall: measured across three seeds
  // the fall is 2.8 to 3.4 either side of any change, so a threshold on it
  // passes or fails on the luck of the draw rather than on anything real.
  assert.ok(sizes[3] >= 19, `squads went ${sizes.map((s) => s.toFixed(1)).join(' → ')}`);
  const smallest = Math.min(...Object.values(game.world.clubs).map((c) => squad(game.world, c.id).length));
  assert.ok(smallest >= 11, `the smallest squad in the world is ${smallest}`);
});

test('squads are sized by division, not by one cap for everybody', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { DEFAULT_CONFIG, tierOfClub, squad } = await import('../core/schema.js');
  const { MAX_SQUAD, ownSquadSize } = await import('../engines/transfers.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'depth', nations: ['ENG', 'ESP'] });
  while (game.world.day < 3 * game.world.seasonLength + 180) step(game, 1);
  const byTier = new Map<number, number[]>();
  for (const club of Object.values(game.world.clubs)) {
    const tier = tierOfClub(game.world, club.id) ?? 0;
    if (!byTier.has(tier)) byTier.set(tier, []);
    // The squad it pays for, not the bodies in the building: a loanee is
    // somebody else's wage bill, and the lower divisions host most of them.
    byTier.get(tier)!.push(ownSquadSize(game.world, club.id));
  }
  const avg = (tier: number) => {
    const a = byTier.get(tier) ?? [];
    return a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  };
  const shape = [1, 2, 3, 4].map((t) => `T${t} ${avg(t).toFixed(1)}`).join(' ');
  // A top-flight club carries more players than a fourth-tier one because it
  // can pay for them. Against one cap for everybody it was the other way
  // round — the lower divisions filled to thirty and the top flight, whose
  // starters are too dear to improve on cheaply, sat at twenty-one.
  assert.ok(avg(1) - avg(4) >= 0.5, `squads by division: ${shape}`);
  assert.ok(avg(2) - avg(4) >= 0.3, `squads by division: ${shape}`);
  assert.ok(avg(3) - avg(4) >= 0, `squads by division: ${shape}`);
  const biggest = Math.max(...Object.values(game.world.clubs).map((c) => squad(game.world, c.id).length));
  assert.ok(biggest <= MAX_SQUAD, `someone is carrying ${biggest} players`);
});

test('the loan market opens, and nobody fills up on other clubs players', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { DEFAULT_CONFIG, squad } = await import('../core/schema.js');
  const { MAX_LOANS_IN } = await import('../engines/transfers.js');
  const { LOAN_WAGE_SHARE, weeklyWageBill } = await import('../rating.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'lending', nations: ['ENG'] });
  let started = 0;
  // Stop mid-season: loans all come home at the rollover.
  while (game.world.day < 2 * game.world.seasonLength + 180) {
    for (const e of step(game, 1)) if (e.type === 'LOAN_STARTED') started++;
  }
  // Charged the whole wage, no club below the top flight could afford anybody's
  // reserves, and held to the squad it pays for every club in the pyramid was
  // full. Between them they shut the loan market completely.
  assert.ok(started >= 20, `only ${started} loans in two and a half seasons`);
  for (const club of Object.values(game.world.clubs)) {
    const here = squad(game.world, club.id).filter((p) => p.loan).length;
    assert.ok(here <= MAX_LOANS_IN, `${club.name} have ${here} players on loan`);
  }
  // The wage follows the split in both directions.
  const lent = Object.values(game.world.players).find((p) => p.loan);
  assert.ok(lent, 'nobody is out on loan');
  const wage = game.world.contracts[lent.contractId!].wage;
  const owner = lent.loan!.fromClubId;
  assert.ok(game.world.idx.loanedOutBy[owner]?.includes(lent.id), 'the owner has lost track of him');
  assert.ok(weeklyWageBill(game.world, owner) > wage * (1 - LOAN_WAGE_SHARE) - 0.001, 'the owner has stopped paying');
});

test('the top flight does not rot away', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { DEFAULT_CONFIG, tierOfClub, squad } = await import('../core/schema.js');
  const { overall } = await import('../rating.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'standards', nations: ['ENG'] });
  const level = (tier: number) => {
    const players = Object.values(game.world.clubs)
      .filter((c) => tierOfClub(game.world, c.id) === tier)
      .flatMap((c) => squad(game.world, c.id));
    return players.reduce((s, p) => s + overall(p), 0) / Math.max(1, players.length);
  };
  const marks: number[] = [];
  const gaps: number[] = [];
  for (let season = 0; season < 4; season++) {
    for (let d = 0; d < 400; d++) {
      step(game, 1);
      if (game.world.day % game.world.seasonLength === game.world.seasonLength - 1) break;
    }
    marks.push(level(1));
    gaps.push(level(1) - level(4));
    step(game, 1);
  }
  // Academy intakes have to reach the standard of the players they replace.
  // Given a ceiling guessed off their age instead of the peak they were drawn
  // to reach, they never did, and the division's best drained away a point a
  // season until the football on show was two divisions worse.
  const shown = marks.map((m) => m.toFixed(1)).join(' → ');
  assert.ok(marks[3] > marks[0] - 1.5, `top flight went ${shown}`);
  // And the pyramid has to keep its shape: a world where everyone reaches
  // their ceiling closes on itself instead, the bottom coming up to the top.
  assert.ok(gaps[3] > gaps[0] - 3, `top flight over fourth tier went ${gaps.map((g) => g.toFixed(1)).join(' → ')}`);
});

test('the last promotion place is settled by a play-off', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { DEFAULT_CONFIG } = await import('../core/schema.js');
  const { computeTable } = await import('../matchday/table.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'playoffs', nations: ['ENG'] });
  for (let d = 0; d < 400; d++) {
    step(game, 1);
    if (game.world.day % game.world.seasonLength === game.world.seasonLength - 1) break;
  }
  const championship = Object.values(game.world.competitions)
    .find((c) => c.kind === 'league' && c.tier === 2 && c.season === game.world.season);
  assert.ok(championship && championship.kind === 'league');
  const table = computeTable(game.world, championship);
  const playoffs = Object.values(game.world.competitions)
    .filter((c) => c.kind === 'cup' && c.cupKind === 'playoff' && c.season === game.world.season);
  assert.ok(playoffs.length >= 3, 'every division that promotes holds one');

  const mine = playoffs.find((c) => c.name.startsWith(championship.name));
  assert.ok(mine && mine.kind === 'cup');
  // The four below the automatic places, and nobody else.
  const expected = table.slice(championship.promote - 1, championship.promote + 3).map((r) => r.clubId);
  assert.deepEqual([...mine.clubIds].sort(), [...expected].sort(), 'the right four clubs play');
  assert.ok(mine.winnerId, 'it produces a winner');

  const fixtures = (game.world.idx.fixturesByCompetition[mine.id] ?? []).map((id) => game.world.fixtures[id]);
  assert.equal(fixtures.length, 5, 'two semi-finals over two legs each, and a final');
  const final = fixtures.filter((f) => f.round === mine.totalRounds);
  const legs = fixtures.filter((f) => f.round < mine.totalRounds);
  assert.equal(final.length, 1, 'one final');
  assert.equal(legs.length, 4, 'four legs');
  for (const f of fixtures) {
    assert.ok(f.played, 'all of them are played');
    assert.ok(f.day - game.world.seasonStartDay > 348, 'they come after the league is over');
  }
  // A leg can end level; the final cannot.
  assert.ok(final[0].winnerId, 'the final produces a winner on the day');
  // Each tie is played home and away.
  for (const tie of [legs.slice(0, 2), legs.slice(2)]) {
    const grounds = new Set(tie.map((f) => f.homeClubId));
    assert.equal(grounds.size, tie.length, 'the legs are at different grounds');
  }

  const third = table[championship.promote - 1].clubId;
  const before = new Set(championship.clubIds);
  step(game, 3);
  const top = Object.values(game.world.competitions)
    .find((c) => c.kind === 'league' && c.tier === 1 && c.season === game.world.season);
  assert.ok(top && top.kind === 'league');
  const up = top.clubIds.filter((id) => before.has(id));
  assert.equal(up.length, championship.promote, 'the same number go up as before');
  assert.ok(up.includes(mine.winnerId!), 'the play-off winner is promoted');
  if (mine.winnerId !== third) assert.ok(!up.includes(third), 'finishing third is not enough');
});

test('what the squad trains on is what improves', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const A = await import('../actions.js');
  const { DEFAULT_CONFIG, squad } = await import('../core/schema.js');

  const run = (focus: Parameters<typeof A.setTraining>[1]) => {
    const game = createGame({ ...DEFAULT_CONFIG, seed: 'training', nations: ['ENG'] });
    const club = Object.values(game.world.clubs).find((c) => c.name === 'Sunderland')!;
    A.takeOverClub(game.ctx, club.id, 'Gaffer');
    const res = A.setTraining(game.ctx, focus);
    assert.ok(res.ok, res.message);
    const before = new Map(squad(game.world, club.id).map((p) => [p.id, { ...p.attrs }]));
    for (let d = 0; d < 400; d++) {
      step(game, 1);
      if (game.world.day % game.world.seasonLength === game.world.seasonLength - 1) break;
    }
    const now = squad(game.world, club.id).filter((p) => before.has(p.id));
    const gain = (k: 'technique' | 'physical') =>
      now.reduce((s, p) => s + (p.attrs[k] - before.get(p.id)![k]), 0) / Math.max(1, now.length);
    return { technique: gain('technique'), physical: gain('physical') };
  };

  const attack = run('attacking');
  const defend = run('defending');
  // Each costs what the other gains: a season on the ball is a season not in
  // the gym. Without this the choice is free and there is nothing to weigh.
  assert.ok(attack.technique > defend.technique, `technique: attacking ${attack.technique.toFixed(2)} vs defending ${defend.technique.toFixed(2)}`);
  assert.ok(defend.physical > attack.physical, `physical: defending ${defend.physical.toFixed(2)} vs attacking ${attack.physical.toFixed(2)}`);
});

test('only the human club trains to order', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const A = await import('../actions.js');
  const { DEFAULT_CONFIG, squad } = await import('../core/schema.js');
  const game = createGame({ ...small, seed: 'training-scope' });
  const clubId = A.jobOffers(game.ctx)[0].club.id;
  A.takeOverClub(game.ctx, clubId, 'Gaffer');
  A.setTraining(game.ctx, 'attacking');
  const other = Object.values(game.world.clubs).find((c) => c.id !== clubId)!;
  const before = new Map(squad(game.world, other.id).map((p) => [p.id, { ...p.attrs }]));
  step(game, 120);
  const now = squad(game.world, other.id).filter((p) => before.has(p.id));
  const pace = now.reduce((s, p) => s + (p.attrs.pace - before.get(p.id)!.pace), 0) / Math.max(1, now.length);
  const physical = now.reduce((s, p) => s + (p.attrs.physical - before.get(p.id)!.physical), 0) / Math.max(1, now.length);
  // Another club's players are not dragged around by your training ground.
  assert.ok(Math.abs(pace - physical) < 0.5, `pace ${pace.toFixed(2)} vs physical ${physical.toFixed(2)} at another club`);
});

test('a club short of players still starts eleven', async () => {
  const { createGame } = await import('../browser/engine.js');
  const { DEFAULT_CONFIG, squad } = await import('../core/schema.js');
  const { selectXI } = await import('../matchday/xi.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'shorthanded', nations: ['ENG'] });
  const club = Object.values(game.world.clubs)[0];
  const players = squad(game.world, club.id);
  assert.ok(players.length >= 12, 'the club starts with a squad');

  // Ban and injure until barely ten are standing: bans from cards and a run of
  // injuries can do this to a thin squad, and it once put ten men on the pitch
  // from the first whistle.
  const spare = players.slice(0, players.length - 10);
  for (let i = 0; i < spare.length; i++) {
    if (i % 2 === 0) spare[i].suspension = 2; else spare[i].injuryDays = 9;
  }
  const fit = squad(game.world, club.id).filter((p) => p.injuryDays === 0 && p.suspension === 0);
  assert.ok(fit.length < 11, `only ${fit.length} are fully fit`);

  const xi = selectXI(game.world, club.id, club.tactic);
  assert.equal(xi.playerIds.length, 11, 'eleven start');
  assert.equal(new Set(xi.playerIds).size, 11, 'and they are eleven different players');
  for (const id of xi.playerIds) {
    assert.equal(game.world.players[id].suspension, 0, 'nobody serving a ban is picked');
  }
});

test('a match report carries numbers that agree with the score', async () => {
  const { createGame, step } = await import('../browser/engine.js');
  const { DEFAULT_CONFIG } = await import('../core/schema.js');
  const game = createGame({ ...DEFAULT_CONFIG, seed: 'stats', nations: ['ENG'] });
  step(game, 120);
  const played = Object.values(game.world.fixtures).filter((f) => f.report);
  assert.ok(played.length > 200, 'a good few matches');

  let shots = 0, onTarget = 0;
  for (const f of played) {
    const s = f.report!.stats;
    assert.equal(s.possession.home + s.possession.away, 100, 'possession adds up');
    assert.ok(s.possession.home >= 30 && s.possession.home <= 70, `possession ${s.possession.home}%`);
    // A goal is a shot on target, and a shot on target is a shot. Report
    // numbers that contradict the scoreline are worse than no numbers.
    assert.ok(s.onTarget.home >= f.homeGoals, 'every goal was on target');
    assert.ok(s.onTarget.away >= f.awayGoals, 'every goal was on target');
    assert.ok(s.shots.home >= s.onTarget.home && s.shots.away >= s.onTarget.away, 'on target is a subset of shots');
    assert.ok(f.report!.motmId, 'somebody is named man of the match');
    shots += (s.shots.home + s.shots.away) / 2;
    onTarget += (s.onTarget.home + s.onTarget.away) / 2;
  }
  // Around thirteen shots a side with a third on target is what football does.
  const perTeam = shots / played.length;
  assert.ok(perTeam > 9 && perTeam < 18, `${perTeam.toFixed(1)} shots a team`);
  assert.ok(onTarget / shots > 0.25 && onTarget / shots < 0.55, `${((onTarget / shots) * 100).toFixed(0)}% on target`);
});

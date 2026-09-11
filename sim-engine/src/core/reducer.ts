/**
 * Applies events to the world. The reducer mutates the world in place for
 * speed; the runner owns the world object and snapshots copy it explicitly.
 * Every state change in the simulation goes through here, so replaying the
 * event log from an empty world rebuilds the identical state.
 */
import type { Event } from './events.js';
import { ATTRIBUTE_KEYS, type Fixture, type World } from './schema.js';
import { clamp } from './rng.js';

/** Keeps id counters in step with stored entities so replay regenerates identical ids. */
function noteId(w: World, id: string): void {
  const i = id.lastIndexOf('_');
  if (i <= 0) return;
  const prefix = id.slice(0, i);
  const n = Number(id.slice(i + 1));
  if (Number.isFinite(n) && n > (w.counters[prefix] ?? 0)) w.counters[prefix] = n;
}

function removeFrom(arr: string[] | undefined, id: string): void {
  if (!arr) return;
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1);
}

function addToSquad(w: World, clubId: string, playerId: string): void {
  const s = (w.idx.squadByClub[clubId] ??= []);
  if (!s.includes(playerId)) s.push(playerId);
}

function movePlayer(w: World, playerId: string, toClubId: string | null): void {
  const p = w.players[playerId];
  if (p.clubId) removeFrom(w.idx.squadByClub[p.clubId], playerId);
  removeFrom(w.freeAgents, playerId);
  p.clubId = toClubId;
  if (toClubId) { addToSquad(w, toClubId, playerId); p.freeSince = null; }
  else { w.freeAgents.push(playerId); p.freeSince = w.day; }
}

function indexFixture(w: World, fixture: Fixture): void {
  const f = structuredClone(fixture);
  noteId(w, f.id);
  w.fixtures[f.id] = f;
  (w.idx.fixturesByDay[f.day] ??= []).push(f.id);
  (w.idx.fixturesByCompetition[f.competitionId] ??= []).push(f.id);
}

function detachManager(w: World, managerId: string, clubId: string): void {
  const m = w.managers[managerId];
  const c = w.clubs[clubId];
  if (m) { m.clubId = null; m.unemployedSince = w.day; }
  if (c && c.managerId === managerId) c.managerId = null;
}

/**
 * Keeps the world bounded: fixtures older than the previous season are
 * dropped and last season's match reports are kept only for the human club.
 */
function pruneFixtures(w: World, season: number): void {
  const human = w.humanClubId;
  for (const id of Object.keys(w.fixtures)) {
    const f = w.fixtures[id];
    if (f.season < season - 1) {
      delete w.fixtures[id];
      const day = w.idx.fixturesByDay[f.day];
      if (day) { const i = day.indexOf(id); if (i >= 0) day.splice(i, 1); if (day.length === 0) delete w.idx.fixturesByDay[f.day]; }
      const comp = w.idx.fixturesByCompetition[f.competitionId];
      if (comp) { const i = comp.indexOf(id); if (i >= 0) comp.splice(i, 1); }
    } else if (f.season < season && f.report && f.homeClubId !== human && f.awayClubId !== human) {
      f.report = { ...f.report, factors: { home: [], away: [] } };
    }
  }
}

export function reduce(w: World, e: Event): void {
  switch (e.type) {
    case 'WORLD_CREATED': {
      w.seed = e.payload.seed;
      w.config = e.payload.config;
      w.seasonLength = e.payload.config.seasonLength;
      break;
    }
    case 'NATION_CREATED': {
      const n = structuredClone(e.payload.nation);
      w.nations[n.id] = n;
      break;
    }
    case 'NEWS_PUBLISHED': {
      for (const item of e.payload.items) { noteId(w, item.id); w.news.push(structuredClone(item)); }
      if (w.news.length > 600) w.news.splice(0, w.news.length - 600);
      break;
    }
    case 'BID_RECEIVED': {
      const bid = structuredClone(e.payload.bid);
      noteId(w, bid.id);
      w.pendingBids.push(bid);
      break;
    }
    case 'BID_RESOLVED': {
      const i = w.pendingBids.findIndex((b) => b.id === e.payload.bidId);
      if (i >= 0) w.pendingBids.splice(i, 1);
      break;
    }
    case 'AWARDS_GIVEN': {
      const summary = w.history.find((h) => h.season === e.payload.season);
      if (summary) summary.awards = structuredClone(e.payload.awards);
      break;
    }
    case 'CLUB_CREATED': {
      // Entities are cloned on the way in so the event log never aliases live state.
      const club = structuredClone(e.payload.club);
      noteId(w, club.id);
      w.clubs[club.id] = club;
      w.idx.squadByClub[club.id] ??= [];
      break;
    }
    case 'PLAYER_CREATED': {
      const p = structuredClone(e.payload.player);
      noteId(w, p.id);
      w.players[p.id] = p;
      if (p.clubId) addToSquad(w, p.clubId, p.id);
      else { w.freeAgents.push(p.id); p.freeSince = w.day; }
      break;
    }
    case 'MANAGER_CREATED': {
      const m = structuredClone(e.payload.manager);
      noteId(w, m.id);
      w.managers[m.id] = m;
      if (m.clubId) w.clubs[m.clubId].managerId = m.id;
      break;
    }
    case 'CONTRACT_SIGNED': {
      const c = structuredClone(e.payload.contract);
      noteId(w, c.id);
      if (e.payload.record) noteId(w, e.payload.record.id);
      const p = w.players[c.playerId];
      const old = w.idx.contractByPlayer[c.playerId];
      if (old) delete w.contracts[old];
      w.contracts[c.id] = c;
      w.idx.contractByPlayer[c.playerId] = c.id;
      p.contractId = c.id;
      p.loan = null;
      if (p.clubId !== c.clubId) movePlayer(w, c.playerId, c.clubId);
      if (e.payload.record) w.transfers.push(structuredClone(e.payload.record));
      break;
    }
    case 'CONTRACT_EXPIRED': {
      const { contractId, playerId } = e.payload;
      delete w.contracts[contractId];
      delete w.idx.contractByPlayer[playerId];
      const p = w.players[playerId];
      p.contractId = null;
      p.loan = null;
      movePlayer(w, playerId, null);
      break;
    }
    case 'COMPETITION_CREATED': {
      const comp = structuredClone(e.payload.competition);
      w.competitions[comp.id] = comp;
      w.idx.fixturesByCompetition[comp.id] ??= [];
      if (comp.kind === 'league') for (const id of comp.clubIds) w.clubs[id].leagueId = comp.id;
      break;
    }
    case 'FIXTURES_SCHEDULED': {
      for (const f of e.payload.fixtures) indexFixture(w, f);
      break;
    }
    case 'SEASON_STARTED': {
      w.season = e.payload.season;
      w.seasonStartDay = e.payload.startDay;
      for (const c of Object.values(w.clubs)) { c.ledger = {}; c.form = []; }
      pruneFixtures(w, e.payload.season);
      break;
    }
    case 'DAY_ADVANCED': {
      w.day = e.payload.day;
      for (const id in w.players) {
        const p = w.players[id];
        if (p.retired) continue;
        if (p.injuryDays > 0) p.injuryDays--;
        if (p.fitness < 100) p.fitness = Math.min(100, p.fitness + 6);
      }
      break;
    }
    case 'BOARDROOM_OPENED': {
      w.boardroom = structuredClone(e.payload.boardroom);
      break;
    }
    case 'BOARDROOM_UPDATED': {
      if (w.boardroom) Object.assign(w.boardroom, structuredClone(e.payload.patch));
      break;
    }
    case 'DECISION_RAISED': {
      w.boardroom?.decisions.push(structuredClone(e.payload.decision));
      break;
    }
    case 'DECISION_RESOLVED': {
      const d = w.boardroom?.decisions.find((x) => x.id === e.payload.decisionId);
      if (d) { d.chosen = e.payload.optionId; d.chosenDay = e.payload.day; }
      break;
    }
    case 'STADIUM_EXPANDED': {
      w.clubs[e.payload.clubId].stadiumCapacity += e.payload.seats;
      break;
    }
    case 'PROJECT_COMPLETED': {
      if (w.boardroom) w.boardroom.projects = w.boardroom.projects.filter((p) => p.id !== e.payload.projectId);
      break;
    }
    case 'HALF_TIME_REACHED': {
      w.halfTime = structuredClone(e.payload.state);
      break;
    }
    case 'MATCH_PLAYED': {
      const { fixtureId, homeGoals, awayGoals, winnerId, report, playerStats } = e.payload;
      if (w.halfTime?.fixtureId === fixtureId) w.halfTime = null;
      const f = w.fixtures[fixtureId];
      f.played = true;
      f.homeGoals = homeGoals;
      f.awayGoals = awayGoals;
      f.winnerId = winnerId;
      f.report = structuredClone(report);
      for (const pid in playerStats) {
        const s = playerStats[pid];
        const p = w.players[pid];
        p.stats.apps += 1;
        p.stats.goals += s.goals;
        p.stats.assists += s.assists;
        p.stats.minutes += s.minutes;
        p.stats.ratingSum += s.rating;
        p.career.apps += 1;
        p.career.goals += s.goals;
        p.fitness = clamp(p.fitness + s.fitnessDelta, 0, 100);
        p.form = clamp(p.form * 0.7 + ((s.rating - 6) * 25 + 50) * 0.3, 0, 100);
        p.lastStartDay = e.day;
      }
      // Cards: bookings on the sheet, bans start with the next match.
      for (const c of report.cards ?? []) {
        const p = w.players[c.playerId];
        if (!p) continue;
        if (c.kind === 'yellow') {
          p.stats.yellows += 1;
          // Every fifth booking of the season costs a match.
          if (p.stats.yellows % 5 === 0) p.suspension += 1;
        } else {
          p.stats.reds += 1;
          if (c.kind === 'second') p.stats.yellows += 1;
        }
        if (c.ban > 0) p.suspension += c.ban;
      }
      // Anybody serving a ban sits this one out, so it ticks down.
      for (const side of [f.homeClubId, f.awayClubId]) {
        for (const pid of w.idx.squadByClub[side] ?? []) {
          const p = w.players[pid];
          if (p.suspension > 0 && !playerStats[pid]) p.suspension -= 1;
        }
      }
      const comp = w.competitions[f.competitionId];
      if (comp.kind === 'league') {
        const hp = homeGoals > awayGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
        const ap = awayGoals > homeGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
        for (const [cid, pts] of [[f.homeClubId, hp], [f.awayClubId, ap]] as const) {
          const form = w.clubs[cid].form;
          form.push(pts);
          if (form.length > 6) form.shift();
        }
      }
      break;
    }
    case 'PLAYER_INJURED': {
      const p = w.players[e.payload.playerId];
      p.injuryDays = e.payload.days;
      p.fitness = clamp(p.fitness - 15, 0, 100);
      break;
    }
    case 'MORALE_CHANGED': {
      for (const pid in e.payload.deltas) {
        const p = w.players[pid];
        if (p) p.morale = clamp(p.morale + e.payload.deltas[pid], 0, 100);
      }
      break;
    }
    case 'FINANCE_POSTED': {
      for (const entry of e.payload.entries) {
        const c = w.clubs[entry.clubId];
        c.balance = Math.round((c.balance + entry.amount) * 10) / 10;
        c.ledger[entry.category] = Math.round(((c.ledger[entry.category] ?? 0) + entry.amount) * 10) / 10;
      }
      break;
    }
    case 'PLAYER_DEVELOPED': {
      for (const pid in e.payload.deltas) {
        const p = w.players[pid];
        const d = e.payload.deltas[pid];
        for (const k of ATTRIBUTE_KEYS) {
          const dv = d[k];
          if (dv !== undefined) p.attrs[k] = clamp(Math.round((p.attrs[k] + dv) * 10) / 10, 1, 99);
        }
      }
      break;
    }
    case 'PLAYER_VALUED': {
      for (const pid in e.payload.values) w.players[pid].value = e.payload.values[pid];
      break;
    }
    case 'PLAYER_TRANSFERRED': {
      const record = structuredClone(e.payload.record);
      const contract = structuredClone(e.payload.contract);
      noteId(w, record.id);
      noteId(w, contract.id);
      const p = w.players[record.playerId];
      const old = w.idx.contractByPlayer[record.playerId];
      if (old) delete w.contracts[old];
      w.contracts[contract.id] = contract;
      w.idx.contractByPlayer[record.playerId] = contract.id;
      p.contractId = contract.id;
      p.loan = null;
      p.listedAt = null;
      movePlayer(w, record.playerId, record.toClubId);
      if (record.fee > 0) {
        w.clubs[record.toClubId].balance -= record.fee;
        w.clubs[record.toClubId].ledger.transfers_out = (w.clubs[record.toClubId].ledger.transfers_out ?? 0) - record.fee;
        if (record.fromClubId) {
          w.clubs[record.fromClubId].balance += record.fee;
          w.clubs[record.fromClubId].ledger.transfers_in = (w.clubs[record.fromClubId].ledger.transfers_in ?? 0) + record.fee;
        }
      }
      w.transfers.push(record);
      break;
    }
    case 'LOAN_STARTED': {
      const { returnSeason } = e.payload;
      const record = structuredClone(e.payload.record);
      noteId(w, record.id);
      const p = w.players[record.playerId];
      p.loan = { toClubId: record.toClubId, returnSeason };
      movePlayer(w, record.playerId, record.toClubId);
      w.transfers.push(record);
      break;
    }
    case 'LOAN_RETURNED': {
      const record = structuredClone(e.payload.record);
      noteId(w, record.id);
      const p = w.players[record.playerId];
      p.loan = null;
      movePlayer(w, record.playerId, record.toClubId);
      w.transfers.push(record);
      break;
    }
    case 'PLAYER_RETIRED': {
      const p = w.players[e.payload.playerId];
      const cid = w.idx.contractByPlayer[p.id];
      if (cid) { delete w.contracts[cid]; delete w.idx.contractByPlayer[p.id]; }
      if (p.clubId) removeFrom(w.idx.squadByClub[p.clubId], p.id);
      removeFrom(w.freeAgents, p.id);
      p.clubId = null;
      p.contractId = null;
      p.loan = null;
      p.retired = true;
      break;
    }
    case 'MANAGER_SACKED': {
      detachManager(w, e.payload.managerId, e.payload.clubId);
      const m = w.managers[e.payload.managerId];
      m.reputation = clamp(m.reputation - 5, 1, 100);
      break;
    }
    case 'MANAGER_CONTRACT_EXPIRED': {
      detachManager(w, e.payload.managerId, e.payload.clubId);
      break;
    }
    case 'MANAGER_APPOINTED': {
      const m = w.managers[e.payload.managerId];
      const c = w.clubs[e.payload.clubId];
      m.clubId = c.id;
      m.unemployedSince = null;
      m.contractEndSeason = e.payload.contractEndSeason;
      c.managerId = m.id;
      break;
    }
    case 'CUP_ROUND_ADVANCED': {
      const comp = w.competitions[e.payload.competitionId];
      if (comp.kind !== 'cup') break;
      comp.round = e.payload.round;
      comp.alive = [...e.payload.alive];
      comp.winnerId = e.payload.winnerId;
      comp.complete = e.payload.winnerId !== null;
      if (comp.round > 0) comp.stage = 'knockout';
      break;
    }
    case 'BUDGETS_SET': {
      for (const cid in e.payload.budgets) {
        const b = e.payload.budgets[cid];
        const c = w.clubs[cid];
        c.wageBudget = b.wageBudget;
        c.transferBudget = b.transferBudget;
        c.boardTarget = b.boardTarget;
      }
      break;
    }
    case 'TACTIC_CHANGED': {
      w.clubs[e.payload.clubId].tactic = e.payload.tactic;
      break;
    }
    case 'SEASON_ENDED': {
      for (const cid in e.payload.leagueMoves) w.clubs[cid].leagueId = e.payload.leagueMoves[cid];
      for (const comp of Object.values(w.competitions)) if (comp.season === e.payload.season) comp.complete = true;
      w.history.push(structuredClone(e.payload.summary));
      break;
    }
    case 'PLAYERS_AGED': {
      for (const id in w.players) {
        const p = w.players[id];
        if (p.retired) continue;
        p.age += 1;
        p.stats = { apps: 0, goals: 0, assists: 0, minutes: 0, ratingSum: 0, yellows: 0, reds: 0 };
        // Bookings wipe at the season break; a ban still to serve carries over.
        p.form = 50;
        p.morale = clamp(Math.round(50 + (p.morale - 50) * 0.5), 0, 100);
      }
      break;
    }
    case 'CLUB_TAKEN_OVER': {
      const m = structuredClone(e.payload.manager);
      noteId(w, m.id);
      const club = w.clubs[e.payload.clubId];
      if (club.managerId) detachManager(w, club.managerId, club.id);
      w.managers[m.id] = m;
      m.clubId = club.id;
      m.unemployedSince = null;
      club.managerId = m.id;
      w.humanClubId = club.id;
      w.humanManagerId = m.id;
      w.careerOver = null;
      break;
    }
    case 'MANAGER_MOVED': {
      const m = w.managers[e.payload.managerId];
      const to = w.clubs[e.payload.toClubId];
      if (e.payload.fromClubId) detachManager(w, e.payload.managerId, e.payload.fromClubId);
      if (to.managerId && to.managerId !== m.id) detachManager(w, to.managerId, to.id);
      m.clubId = to.id;
      m.unemployedSince = null;
      m.contractEndSeason = e.payload.contractEndSeason;
      to.managerId = m.id;
      if (w.humanManagerId === m.id) { w.humanClubId = to.id; w.careerOver = null; }
      break;
    }
    case 'PLAYER_LISTED': {
      w.players[e.payload.playerId].listedAt = e.payload.askingPrice;
      break;
    }
    case 'PLAYER_UNLISTED': {
      w.players[e.payload.playerId].listedAt = null;
      break;
    }
    case 'PLAYER_RELEASED': {
      const { playerId, clubId, payoff } = e.payload;
      const cid = w.idx.contractByPlayer[playerId];
      if (cid) { delete w.contracts[cid]; delete w.idx.contractByPlayer[playerId]; }
      const p = w.players[playerId];
      p.contractId = null;
      p.loan = null;
      p.listedAt = null;
      movePlayer(w, playerId, null);
      if (payoff > 0) {
        const c = w.clubs[clubId];
        c.balance -= payoff;
        c.ledger.payoffs = (c.ledger.payoffs ?? 0) - payoff;
      }
      break;
    }
    case 'CAREER_ENDED': {
      w.careerOver = { day: e.day, season: w.season, reason: e.payload.reason };
      w.humanClubId = null;
      break;
    }
    default: {
      const never: never = e;
      throw new Error(`Unhandled event ${(never as Event).type}`);
    }
  }
}

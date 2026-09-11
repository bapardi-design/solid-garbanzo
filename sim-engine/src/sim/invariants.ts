/** Structural checks run at season boundaries; any violation is a bug. */
import type { World } from '../core/schema.js';

export function checkInvariants(world: World): string[] {
  const errors: string[] = [];
  const err = (msg: string) => { if (errors.length < 50) errors.push(msg); };

  // Squad index matches player club membership.
  const seen = new Set<string>();
  for (const clubId in world.idx.squadByClub) {
    if (!world.clubs[clubId]) err(`squad index for unknown club ${clubId}`);
    for (const pid of world.idx.squadByClub[clubId]) {
      const p = world.players[pid];
      if (!p) { err(`squad ${clubId} references unknown player ${pid}`); continue; }
      if (p.clubId !== clubId) err(`player ${pid} in squad ${clubId} but clubId=${p.clubId}`);
      if (p.retired) err(`retired player ${pid} still in squad ${clubId}`);
      if (seen.has(pid)) err(`player ${pid} in two squads`);
      seen.add(pid);
    }
  }
  for (const pid in world.players) {
    const p = world.players[pid];
    if (p.retired) {
      if (p.clubId || p.contractId) err(`retired player ${pid} still attached`);
      continue;
    }
    if (p.clubId && !seen.has(pid)) err(`player ${pid} has clubId ${p.clubId} but is not in that squad index`);
    if (!p.clubId && !world.freeAgents.includes(pid)) err(`clubless player ${pid} not in free agents`);
    if (p.clubId && world.freeAgents.includes(pid)) err(`player ${pid} both at club and free agent`);
    const cid = world.idx.contractByPlayer[pid];
    if (p.contractId !== (cid ?? null)) err(`player ${pid} contractId ${p.contractId} != index ${cid}`);
    if (p.clubId && !cid) err(`player ${pid} at club without a contract`);
    if (cid) {
      const c = world.contracts[cid];
      if (!c) { err(`contract ${cid} missing`); continue; }
      if (c.playerId !== pid) err(`contract ${cid} player mismatch`);
      const expectedClub = p.loan ? p.loan.toClubId : c.clubId;
      if (p.clubId !== expectedClub) err(`player ${pid} clubId ${p.clubId} != contract/loan club ${expectedClub}`);
      if (c.lengthSeasons < 1 || c.endSeason < c.startSeason) err(`contract ${cid} has non-positive length`);
      if (c.wage < 1) err(`contract ${cid} wage ${c.wage}`);
    }
    if (p.morale < 0 || p.morale > 100) err(`player ${pid} morale ${p.morale}`);
    if (p.fitness < 0 || p.fitness > 100) err(`player ${pid} fitness ${p.fitness}`);
  }
  for (const cid in world.contracts) {
    const c = world.contracts[cid];
    if (world.idx.contractByPlayer[c.playerId] !== cid) err(`orphan contract ${cid}`);
    if (!world.clubs[c.clubId]) err(`contract ${cid} for unknown club`);
  }
  for (const clubId in world.clubs) {
    const club = world.clubs[clubId];
    if (!Number.isFinite(club.balance)) err(`club ${clubId} balance not finite`);
    if (club.managerId) {
      const m = world.managers[club.managerId];
      if (!m || m.clubId !== clubId) err(`club ${clubId} manager link broken`);
    }
  }
  for (const mid in world.managers) {
    const m = world.managers[mid];
    if (m.clubId && world.clubs[m.clubId].managerId !== mid) err(`manager ${mid} thinks it runs ${m.clubId}`);
  }
  for (const fid in world.fixtures) {
    const f = world.fixtures[fid];
    if (f.homeClubId === f.awayClubId) err(`fixture ${fid} club plays itself`);
    if (f.played && (f.homeGoals < 0 || f.awayGoals < 0)) err(`fixture ${fid} negative score`);
    if (f.played && f.report && (f.report.homeXI.length !== 11 || f.report.awayXI.length !== 11)) err(`fixture ${fid} XI size`);
    if (f.played && f.report && new Set([...f.report.homeXI, ...f.report.awayXI]).size !== 22) err(`fixture ${fid} duplicate players in XIs`);
    if (f.knockout && f.played && !f.winnerId) err(`knockout fixture ${fid} has no winner`);
    if (!(world.idx.fixturesByDay[f.day] ?? []).includes(fid)) err(`fixture ${fid} missing from day index`);
  }
  // No club plays twice on one day.
  for (const day in world.idx.fixturesByDay) {
    const clubs = new Set<string>();
    for (const fid of world.idx.fixturesByDay[day]) {
      const f = world.fixtures[fid];
      for (const c of [f.homeClubId, f.awayClubId]) {
        if (clubs.has(c)) err(`club ${c} plays twice on day ${day}`);
        clubs.add(c);
      }
    }
  }
  for (const comp of Object.values(world.competitions)) {
    if (comp.kind !== 'league' || !comp.complete || comp.season < world.season - 1) continue;
    const n = comp.clubIds.length;
    const fixtures = (world.idx.fixturesByCompetition[comp.id] ?? []).map((id) => world.fixtures[id]);
    if (fixtures.length !== n * (n - 1)) err(`league ${comp.id} has ${fixtures.length} fixtures, expected ${n * (n - 1)}`);
    if (fixtures.some((f) => !f.played)) err(`league ${comp.id} complete with unplayed fixtures`);
  }
  return errors;
}

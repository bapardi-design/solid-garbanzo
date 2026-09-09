import type { CompetitionLeague, World } from '../core/schema.js';

export interface Standing {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  position: number;
}

export function computeTable(world: World, comp: CompetitionLeague): Standing[] {
  const rows = new Map<string, Standing>();
  for (const id of comp.clubIds) {
    rows.set(id, { clubId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, position: 0 });
  }
  for (const fid of world.idx.fixturesByCompetition[comp.id] ?? []) {
    const f = world.fixtures[fid];
    if (!f.played) continue;
    const h = rows.get(f.homeClubId);
    const a = rows.get(f.awayClubId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += f.homeGoals; h.ga += f.awayGoals;
    a.gf += f.awayGoals; a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { h.won++; a.lost++; h.points += 3; }
    else if (f.homeGoals < f.awayGoals) { a.won++; h.lost++; a.points += 3; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  const table = [...rows.values()];
  for (const r of table) r.gd = r.gf - r.ga;
  table.sort((x, y) =>
    y.points - x.points || y.gd - x.gd || y.gf - x.gf || world.clubs[x.clubId].name.localeCompare(world.clubs[y.clubId].name));
  table.forEach((r, i) => { r.position = i + 1; });
  return table;
}

export function positionOf(table: Standing[], clubId: string): number {
  return table.find((r) => r.clubId === clubId)?.position ?? table.length;
}

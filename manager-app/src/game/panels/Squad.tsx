'use client';
import { useState } from 'react';
import Engine from 'sim-engine';
import { money, wage } from '../format';
import { Flag, Ovr, POS_ORDER, type GameT } from './shared';

type Sort = 'pos' | 'ovr' | 'age' | 'value' | 'wage' | 'apps' | 'goals' | 'rating';

export function SquadPanel({ game, clubId, onPlayer }: { game: GameT; clubId: string; onPlayer: (id: string) => void }) {
  const { world } = game;
  const [sort, setSort] = useState<Sort>('pos');
  const cur = Engine.currencyFor(world, clubId);
  const club = world.clubs[clubId];
  // Not memoised on `world`: the engine mutates the world in place, so the
  // object never changes identity and a memo keyed on it went stale the
  // moment anybody was sold, released or sent out on loan. Sorting twenty-odd
  // players costs nothing.
  const players = (() => {
    const list = Engine.squad(world, clubId).slice();
    const c = (id: string) => Engine.contractOf(world, id);
    list.sort((a, b) => {
      switch (sort) {
        case 'ovr': return Engine.overall(b) - Engine.overall(a);
        case 'age': return a.age - b.age;
        case 'value': return b.value - a.value;
        case 'wage': return (c(b.id)?.wage ?? 0) - (c(a.id)?.wage ?? 0);
        case 'apps': return b.stats.apps - a.stats.apps;
        case 'goals': return b.stats.goals - a.stats.goals;
        case 'rating': return Engine.averageRating(b) - Engine.averageRating(a);
        default: return POS_ORDER[a.position] - POS_ORDER[b.position] || Engine.overall(b) - Engine.overall(a);
      }
    });
    return list;
  })();
  const xi = new Set(Engine.selectXI(world, clubId, club.tactic).playerIds);
  // Loaned-out players are in someone else's squad, so they have to be looked
  // up through the club that is still paying most of their wages.
  const out = (world.idx.loanedOutBy[clubId] ?? []).map((id) => world.players[id]).filter(Boolean);
  const expiring = players.filter((p) => { const c = Engine.contractOf(world, p.id); return c && c.endSeason === world.season; }).length;
  const bill = Engine.weeklyWageBill(world, clubId);
  const avgAge = players.reduce((s, p) => s + p.age, 0) / Math.max(1, players.length);
  const foreign = players.filter((p) => p.nationality !== club.nationId).length;
  const th = (id: Sort, label: string, num = false) => <th className={num ? 'num' : ''}><button className={`sortbtn ${sort === id ? 'on' : ''}`} onClick={() => setSort(id)}>{label}</button></th>;
  return (
    <section className="panel">
      <header>
        <h3>Squad</h3>
        <span className="muted">{players.length} players · avg age {avgAge.toFixed(1)} · {foreign} foreign · wages {wage(bill, cur)} of {wage(club.wageBudget, cur)}{expiring ? ` · ${expiring} expiring` : ''}</span>
      </header>
      <div className="scroll">
        <table className="squad">
          <thead><tr><th></th>{th('pos', 'Player')}<th>Pos</th><th>Nat</th>{th('age', 'Age', true)}{th('ovr', 'Ovr', true)}<th className="num">Pot</th><th className="num">Fit</th><th className="num">Mor</th>{th('apps', 'Apps', true)}{th('goals', 'G', true)}<th className="num">A</th><th className="num" title="Yellow cards / red cards">Cards</th>{th('rating', 'Rat', true)}{th('value', 'Value', true)}{th('wage', 'Wage', true)}<th className="num">Until</th><th>Status</th></tr></thead>
          <tbody>
            {players.map((p) => {
              const c = Engine.contractOf(world, p.id);
              const exp = c && c.endSeason === world.season;
              const scout = Engine.scoutReport(world, p.id);
              return (
                <tr key={p.id} className={xi.has(p.id) ? 'mine' : ''} onClick={() => onPlayer(p.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono muted">{xi.has(p.id) ? 'XI' : ''}</td>
                  <td><a>{p.name}</a></td>
                  <td>{p.position}</td>
                  <td><Flag nat={p.nationality} /></td>
                  <td className="num">{p.age}</td>
                  <td className="num"><Ovr v={Engine.overall(p)} /></td>
                  <td className="num muted">{scout.potentialLow}–{scout.potentialHigh}</td>
                  <td className="num">{Math.round(p.fitness)}</td>
                  <td className="num">{p.morale}</td>
                  <td className="num">{p.stats.apps}</td>
                  <td className="num">{p.stats.goals}</td>
                  <td className="num">{p.stats.assists}</td>
                  <td className="num mono">{p.stats.yellows || p.stats.reds ? <><span className="card-y">{p.stats.yellows}</span>{p.stats.reds ? <span className="card-r">{p.stats.reds}</span> : null}</> : <span className="muted">–</span>}</td>
                  <td className="num">{p.stats.apps ? Engine.averageRating(p).toFixed(2) : '–'}</td>
                  <td className="num">{money(p.value, cur)}</td>
                  <td className="num">{c ? wage(c.wage, cur) : '–'}</td>
                  <td className="num">{c ? `S${c.endSeason}` : '–'}</td>
                  <td>
                    {p.injuryDays > 0 ? <span className="pill bad">inj {p.injuryDays}d</span> : null}{' '}
                    {p.suspension > 0 ? <span className="pill bad">banned {p.suspension}</span> : null}{' '}
                    {p.stats.yellows % 5 === 4 ? <span className="pill warn">1 from a ban</span> : null}{' '}
                    {p.loan ? <span className="pill">loan</span> : null}{' '}
                    {p.listedAt !== null ? <span className="pill warn">listed</span> : null}{' '}
                    {exp ? <span className="pill warn">expiring</span> : null}{' '}
                    {p.morale < 35 ? <span className="pill bad">unhappy</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {out.length ? (
        <div className="body">
          <p className="side">Out on loan</p>
          <ul className="settled">
            {out.map((p) => (
              <li key={p.id} onClick={() => onPlayer(p.id)} style={{ cursor: 'pointer' }}>
                <span className="tag">{p.position}</span>
                <b>{p.name}</b>
                <span className="muted">at {world.clubs[p.loan!.toClubId]?.name ?? 'another club'} · {p.stats.apps} app{p.stats.apps === 1 ? '' : 's'} · back at the end of the season</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

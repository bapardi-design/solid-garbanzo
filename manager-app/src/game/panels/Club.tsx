'use client';
import { useMemo, useState } from 'react';
import Engine, { type BoardStatus } from 'sim-engine';
import { money, wage, ord } from '../format';
import { Flag, Ovr, type Action, type GameT } from './shared';

export function ClubPanel({ game, clubId, board, onPlayer }: { game: GameT; clubId: string; board: BoardStatus | null; onPlayer: (id: string) => void }) {
  const { world } = game;
  const club = world.clubs[clubId];
  const cur = Engine.currencyFor(world, clubId);
  const manager = world.humanManagerId ? world.managers[world.humanManagerId] : null;
  const honours = Engine.clubHonours(world, clubId);
  const youth = useMemo(() => Engine.squad(world, clubId).filter((p) => p.age <= 20).sort((a, b) => b.potential - a.potential), [world, clubId, world.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const league = Engine.leagueOf(world, clubId);
  const confidence = board ? Math.max(5, Math.min(98, 70 - (board.position - board.target) * 6 + (board.formPoints - 8) * 2)) : 50;
  const nation = world.nations[club.nationId];
  const awards = world.history.flatMap((h) => (h.awards ?? []).map((a) => ({ ...a, season: h.season }))).reverse();
  return (
    <div className="grid-2">
      <div className="stack">
        <section className="panel">
          <header><h3>{club.name}</h3><span className="muted">{club.city}, {nation?.name} · {league?.name}</span></header>
          <div className="tiles">
            <div className="tile"><div className="v">{club.reputation}</div><div className="k">Reputation</div><div className="sub">world ranking of the club</div></div>
            <div className="tile"><div className="v">{club.stadiumCapacity.toLocaleString('en-GB')}</div><div className="k">Stadium</div><div className="sub">capacity</div></div>
            <div className="tile"><div className="v">{money(club.balance, cur)}</div><div className="k">Bank</div><div className="sub">wage budget {wage(club.wageBudget, cur)}</div></div>
            <div className="tile"><div className="v">{confidence}%</div><div className="k">Board confidence</div><div className="sub">{board?.note}</div></div>
          </div>
          <div className="body">
            <p className="side">Season objectives</p>
            <ul className="plain checks">
              <li className={board && board.position <= board.target ? 'ok' : ''}>Finish {ord(board?.target ?? 1)} or better in the {league?.name}</li>
              <li className={club.balance >= 0 ? 'ok' : ''}>Stay solvent</li>
              <li className={(board?.wageBill ?? 0) <= (board?.wageBudget ?? 0) ? 'ok' : ''}>Keep wages inside the budget</li>
              {league && league.tier === 1 && nation ? <li className={board && board.position <= nation.continentalSlots ? 'ok' : ''}>Bonus: qualify for the {Engine.CONTINENTAL_CUP_NAME} (top {nation.continentalSlots})</li> : null}
            </ul>
          </div>
        </section>
        {manager ? (
          <section className="panel">
            <header><h3>Manager profile</h3></header>
            <div className="tiles">
              <div className="tile"><div className="v">{manager.name}</div><div className="k">Name</div></div>
              <div className="tile"><div className="v">{manager.reputation}</div><div className="k">Reputation</div><div className="sub">grows with results</div></div>
              <div className="tile"><div className="v">{manager.ability}</div><div className="k">Ability</div><div className="sub">coaching effect</div></div>
              <div className="tile"><div className="v">S{manager.contractEndSeason}</div><div className="k">Contract until</div></div>
            </div>
          </section>
        ) : null}
        <section className="panel">
          <header><h3>Youth academy</h3><span className="muted">{youth.length} players aged 20 and under · new intake every pre-season</span></header>
          <div className="scroll">
            <table>
              <thead><tr><th>Player</th><th>Pos</th><th>Nat</th><th className="num">Age</th><th className="num">Ovr</th><th className="num">Potential</th><th>Verdict</th></tr></thead>
              <tbody>{youth.map((p) => { const s = Engine.scoutReport(world, p.id); return <tr key={p.id} onClick={() => onPlayer(p.id)} style={{ cursor: 'pointer' }}><td><a>{p.name}</a></td><td>{p.position}</td><td><Flag nat={p.nationality} /></td><td className="num">{p.age}</td><td className="num"><Ovr v={Engine.overall(p)} /></td><td className="num">{s.potentialLow}–{s.potentialHigh}</td><td className="muted">{s.verdict}</td></tr>; })}</tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="stack">
        <section className="panel">
          <header><h3>Honours</h3></header>
          {honours.length === 0 ? <p className="empty">Nothing in the cabinet yet.</p> : <ul className="news">{honours.map((h, i) => <li key={i}><span className="d">S{h.season}</span><b>{h.title}</b>{h.detail ? <span className="muted"> · {h.detail}</span> : null}</li>)}</ul>}
        </section>
        <section className="panel">
          <header><h3>Roll of honour</h3><span className="muted">world awards by season</span></header>
          {awards.length === 0 ? <p className="empty">Awards are handed out at the end of each season.</p> : (
            <ul className="news">{awards.slice(0, 40).map((a, i) => <li key={i}><span className="d">S{a.season}</span><b>{a.title}</b>: {a.playerId ? <a onClick={() => onPlayer(a.playerId!)}>{world.players[a.playerId]?.name}</a> : a.managerId ? world.managers[a.managerId]?.name : ''} <span className="muted">({a.clubId ? world.clubs[a.clubId]?.name : ''}, {a.detail})</span></li>)}</ul>
          )}
        </section>
        <PastSeasons game={game} clubId={clubId} />
      </div>
    </div>
  );
}

function PastSeasons({ game, clubId }: { game: GameT; clubId: string }) {
  const { world } = game;
  const [open, setOpen] = useState<number | null>(null);
  if (world.history.length === 0) return null;
  return (
    <section className="panel">
      <header><h3>Past seasons</h3></header>
      <ul className="news">
        {[...world.history].reverse().map((h) => {
          const champs = Object.entries(h.champions).map(([id, w]) => ({ comp: world.competitions[id]?.name ?? id.replace(/_S\d+$/, ''), club: world.clubs[w]?.name ?? w })).filter((x) => /Premier|Primera|Bundesliga|Serie Alpha|Ligue Première|Continental|Division 1/.test(x.comp));
          return (
            <li key={h.season} onClick={() => setOpen(open === h.season ? null : h.season)} style={{ cursor: 'pointer' }}>
              <span className="d">S{h.season}</span><b>You finished {h.positions[clubId] ? ord(h.positions[clubId]) : '–'}</b>{h.promoted.includes(clubId) ? <span className="pill good"> promoted</span> : h.relegated.includes(clubId) ? <span className="pill bad"> relegated</span> : null}
              {open === h.season ? <div className="bodytext">{champs.map((c) => <p key={c.comp}>{c.comp}: {c.club}</p>)}{h.topScorer ? <p>Top scorer worldwide: {world.players[h.topScorer.playerId]?.name} ({h.topScorer.goals})</p> : null}</div> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function JobsPanel({ game, onAction }: { game: GameT; onAction: Action }) {
  const { world, ctx } = game;
  const jobs = Engine.vacancies(ctx);
  return (
    <section className="panel">
      <header><h3>Vacancies</h3><span className="muted">{jobs.length} clubs without a manager would talk to you · leaving mid-season is allowed</span></header>
      {jobs.length === 0 ? <p className="empty">No club is hiring right now. Sackings come after bad runs; check back in a few weeks.</p> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Club</th><th>League</th><th className="num">Reputation</th><th className="num">Bank</th><th className="num">Squad</th><th>Interest</th><th></th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.club.id}>
                  <td><b>{j.club.name}</b> <Flag nat={j.club.nationId} /></td>
                  <td>{Engine.leagueOf(world, j.club.id)?.name ?? `Tier ${j.tier}`}</td>
                  <td className="num">{j.reputation}</td>
                  <td className="num">{money(j.club.balance, Engine.currencyFor(world, j.club.id))}</td>
                  <td className="num">{Math.round(Engine.squadStrength(world, j.club.id))}</td>
                  <td><span className={`pill ${j.interest === 'keen' ? 'good' : j.interest === 'open' ? 'warn' : ''}`}>{j.interest}</span> <span className="muted">{j.note}</span></td>
                  <td><button className="btn small primary" onClick={() => { if (confirm(`Apply for the ${j.club.name} job? If they say yes you leave immediately.`)) onAction(Engine.acceptJob(ctx, j.club.id)); }}>Apply</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

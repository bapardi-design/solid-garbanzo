'use client';
import { useMemo, useState } from 'react';
import Engine, { type CompetitionCup, type CompetitionLeague, type Fixture } from 'sim-engine';
import { dayLabel } from '../format';
import { Crest, Flag, MatchReportView, Ovr, type GameT } from './shared';

export function CompetitionsPanel({ game, clubId, onPlayer }: { game: GameT; clubId: string; onPlayer: (id: string) => void }) {
  const { world } = game;
  const club = world.clubs[clubId];
  const nations = Object.values(world.nations).sort((a, b) => b.coefficient - a.coefficient);
  const hasCont = Object.values(world.competitions).some((c) => c.kind === 'cup' && c.cupKind === 'continental' && c.season === world.season);
  const [nation, setNation] = useState<string>(club.nationId);
  const [compId, setCompId] = useState<string>(club.leagueId);
  const comps = useMemo(() => Object.values(world.competitions).filter((c) => c.season === world.season && (nation === 'CONT' ? c.kind === 'cup' && c.cupKind === 'continental' : (c.kind === 'league' ? c.nationId === nation : c.nationId === nation)))
    .sort((a, b) => (a.kind === 'league' && b.kind === 'league' ? a.tier - b.tier : a.kind === 'league' ? -1 : b.kind === 'league' ? 1 : a.id.localeCompare(b.id))), [world, nation, world.season]); // eslint-disable-line react-hooks/exhaustive-deps
  const comp = world.competitions[compId] && comps.some((c) => c.id === compId) ? world.competitions[compId] : comps[0];
  return (
    <div className="stack">
      <div className="tabs sub" role="tablist">
        {nations.map((n) => <button key={n.id} role="tab" aria-selected={nation === n.id} onClick={() => { setNation(n.id); setCompId(''); }}>{n.name}</button>)}
        {hasCont ? <button role="tab" aria-selected={nation === 'CONT'} onClick={() => { setNation('CONT'); setCompId(''); }}>{Engine.CONTINENTAL_CUP_NAME}</button> : null}
      </div>
      <div className="chips">{comps.map((c) => <button key={c.id} className={comp?.id === c.id ? 'on' : ''} onClick={() => setCompId(c.id)}>{c.name}</button>)}</div>
      {!comp ? <p className="empty">No competitions running.</p> : comp.kind === 'league' ? <LeagueView game={game} clubId={clubId} comp={comp} onPlayer={onPlayer} /> : <CupView game={game} clubId={clubId} comp={comp} onPlayer={onPlayer} />}
    </div>
  );
}

function LeagueView({ game, clubId, comp, onPlayer }: { game: GameT; clubId: string; comp: CompetitionLeague; onPlayer: (id: string) => void }) {
  const { world } = game;
  const table = Engine.computeTable(world, comp);
  const n = comp.clubIds.length;
  const nation = world.nations[comp.nationId];
  const contSlots = comp.tier === 1 ? nation?.continentalSlots ?? 0 : 0;
  const scorers = useMemo(() => comp.clubIds.flatMap((id) => Engine.squad(world, id)).filter((p) => p.stats.goals > 0).sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists).slice(0, 12), [world, comp, world.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const rated = useMemo(() => comp.clubIds.flatMap((id) => Engine.squad(world, id)).filter((p) => p.stats.apps >= 5).sort((a, b) => Engine.averageRating(b) - Engine.averageRating(a)).slice(0, 12), [world, comp, world.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const [round, setRound] = useState<number | null>(null);
  const fixtures = (world.idx.fixturesByCompetition[comp.id] ?? []).map((id) => world.fixtures[id]);
  const lastRound = fixtures.filter((f) => f.played).reduce((m, f) => Math.max(m, f.round), 0);
  const showRound = round ?? Math.max(1, lastRound);
  const roundFixtures = fixtures.filter((f) => f.round === showRound).sort((a, b) => world.clubs[a.homeClubId].name.localeCompare(world.clubs[b.homeClubId].name));
  const maxRound = (n - 1) * 2;
  return (
    <div className="grid-2 wide">
      <section className="panel">
        <header><h3>{comp.name}</h3><span className="muted">{nation?.name} tier {comp.tier} · {n} clubs{comp.promote ? ` · ${comp.promote} up` : ''}{comp.relegate ? ` · ${comp.relegate} down` : ''}{contSlots ? ` · top ${contSlots} qualify` : ''}</span></header>
        <div className="scroll">
          <table>
            <thead><tr><th className="num">#</th><th>Club</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GF</th><th className="num">GA</th><th className="num">GD</th><th className="num">Pts</th><th>Form</th><th>Manager</th></tr></thead>
            <tbody>
              {table.map((r) => {
                const c = world.clubs[r.clubId];
                const cls = [r.clubId === clubId ? 'mine' : '', comp.promote > 0 && r.position <= comp.promote ? 'zone-up' : contSlots > 0 && r.position <= contSlots ? 'zone-cont' : comp.relegate > 0 && r.position > n - comp.relegate ? 'zone-down' : ''].join(' ');
                return <tr key={r.clubId} className={cls}><td className="num">{r.position}</td><td className="club-cell"><Crest name={c.name} short={c.short} size="xs" />{c.name}</td><td className="num">{r.played}</td><td className="num">{r.won}</td><td className="num">{r.drawn}</td><td className="num">{r.lost}</td><td className="num">{r.gf}</td><td className="num">{r.ga}</td><td className="num">{r.gd > 0 ? '+' : ''}{r.gd}</td><td className="num pts">{r.points}</td><td className="mono muted">{c.form.map((p) => (p === 3 ? 'W' : p === 1 ? 'D' : 'L')).join('')}</td><td className="muted">{c.managerId ? world.managers[c.managerId].name : 'vacant'}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="stack">
        <section className="panel">
          <header><h3>Results</h3><div className="actions"><button className="btn small" onClick={() => setRound(Math.max(1, showRound - 1))} disabled={showRound <= 1}>‹</button><span className="mono">round {showRound} of {maxRound}</span><button className="btn small" onClick={() => setRound(Math.min(maxRound, showRound + 1))} disabled={showRound >= maxRound}>›</button></div></header>
          <FixtureList game={game} fixtures={roundFixtures} clubId={clubId} onPlayer={onPlayer} />
        </section>
        <section className="panel">
          <header><h3>Top scorers</h3></header>
          <div className="scroll"><table><thead><tr><th>Player</th><th>Club</th><th className="num">G</th><th className="num">A</th></tr></thead><tbody>{scorers.map((p) => <tr key={p.id} onClick={() => onPlayer(p.id)} style={{ cursor: 'pointer' }}><td><a>{p.name}</a> <Flag nat={p.nationality} /></td><td>{world.clubs[p.clubId!]?.short}</td><td className="num">{p.stats.goals}</td><td className="num">{p.stats.assists}</td></tr>)}</tbody></table></div>
        </section>
        <section className="panel">
          <header><h3>Best rated</h3></header>
          <div className="scroll"><table><thead><tr><th>Player</th><th>Club</th><th className="num">Apps</th><th className="num">Rat</th><th className="num">Ovr</th></tr></thead><tbody>{rated.map((p) => <tr key={p.id} onClick={() => onPlayer(p.id)} style={{ cursor: 'pointer' }}><td><a>{p.name}</a></td><td>{world.clubs[p.clubId!]?.short}</td><td className="num">{p.stats.apps}</td><td className="num">{Engine.averageRating(p).toFixed(2)}</td><td className="num"><Ovr v={Engine.overall(p)} /></td></tr>)}</tbody></table></div>
        </section>
      </div>
    </div>
  );
}

function FixtureList({ game, fixtures, clubId, onPlayer }: { game: GameT; fixtures: Fixture[]; clubId: string; onPlayer: (id: string) => void }) {
  const { world } = game;
  const [open, setOpen] = useState<string | null>(null);
  if (fixtures.length === 0) return <p className="empty">No fixtures.</p>;
  return (
    <>
      <ul className="rows">
        {fixtures.map((f) => (
          <li key={f.id} aria-selected={open === f.id} onClick={() => f.played && setOpen(open === f.id ? null : f.id)} style={{ cursor: f.played ? 'pointer' : 'default' }} className={f.homeClubId === clubId || f.awayClubId === clubId ? 'mine' : ''}>
            <span className="h"><Crest name={world.clubs[f.homeClubId].name} short={world.clubs[f.homeClubId].short} size="xs" />{world.clubs[f.homeClubId].name}</span>
            <span className="s">{f.played ? `${f.homeGoals}–${f.awayGoals}` : dayLabel(f.day - world.seasonStartDay)}</span>
            <span><Crest name={world.clubs[f.awayClubId].name} short={world.clubs[f.awayClubId].short} size="xs" />{world.clubs[f.awayClubId].name}</span>
            {f.report?.penalties ? <span className="meta">pens {f.report.penalties.home}–{f.report.penalties.away}</span> : null}
          </li>
        ))}
      </ul>
      {open && world.fixtures[open] ? <div className="body"><MatchReportView game={game} fixture={world.fixtures[open]} open onPlayer={onPlayer} /></div> : null}
    </>
  );
}

function CupView({ game, clubId, comp, onPlayer }: { game: GameT; clubId: string; comp: CompetitionCup; onPlayer: (id: string) => void }) {
  const { world } = game;
  const fixtures = (world.idx.fixturesByCompetition[comp.id] ?? []).map((id) => world.fixtures[id]);
  const knockout = fixtures.filter((f) => f.group === null);
  const rounds = [...new Set(knockout.map((f) => f.round))].sort((a, b) => b - a);
  const [round, setRound] = useState<number | null>(null);
  const showRound = round ?? rounds[0] ?? 1;
  return (
    <div className="stack">
      <section className="panel">
        <header><h3>{comp.name}</h3><span className="muted">{comp.clubIds.length} clubs · {comp.winnerId ? `winners: ${world.clubs[comp.winnerId].name}` : comp.stage === 'groups' ? 'group stage' : `${Engine.roundLabel(comp.round, comp.totalRounds)} next`} · {comp.alive.length} still in</span></header>
      </section>
      {comp.groups ? (
        <div className="groups">
          {comp.groups.map((g, i) => {
            const table = Engine.computeGroupTable(world, comp, i);
            return (
              <section className="panel" key={i}>
                <header><h3>Group {String.fromCharCode(65 + i)}</h3></header>
                <table>
                  <thead><tr><th>Club</th><th className="num">P</th><th className="num">GD</th><th className="num">Pts</th></tr></thead>
                  <tbody>{table.map((r) => <tr key={r.clubId} className={`${r.clubId === clubId ? 'mine' : ''} ${r.position <= 2 ? 'zone-up' : ''}`}><td className="club-cell"><Crest name={world.clubs[r.clubId].name} short={world.clubs[r.clubId].short} size="xs" />{world.clubs[r.clubId].name} <Flag nat={world.clubs[r.clubId].nationId} /></td><td className="num">{r.played}</td><td className="num">{r.gd > 0 ? '+' : ''}{r.gd}</td><td className="num pts">{r.points}</td></tr>)}</tbody>
                </table>
              </section>
            );
          })}
        </div>
      ) : null}
      {rounds.length ? (
        <section className="panel">
          <header><h3>Knockout</h3><div className="chips">{[...rounds].reverse().map((r) => <button key={r} className={showRound === r ? 'on' : ''} onClick={() => setRound(r)}>{Engine.roundLabel(r, comp.totalRounds)}</button>)}</div></header>
          <FixtureList game={game} fixtures={knockout.filter((f) => f.round === showRound).sort((a, b) => world.clubs[a.homeClubId].name.localeCompare(world.clubs[b.homeClubId].name))} clubId={clubId} onPlayer={onPlayer} />
        </section>
      ) : null}
      {comp.groups ? (
        <section className="panel">
          <header><h3>Group matches</h3></header>
          <FixtureList game={game} fixtures={fixtures.filter((f) => f.group !== null).sort((a, b) => a.day - b.day || (a.group ?? 0) - (b.group ?? 0))} clubId={clubId} onPlayer={onPlayer} />
        </section>
      ) : null}
    </div>
  );
}

'use client';
import { useMemo, useState } from 'react';
import Engine, { type BoardStatus, type Fixture, type GoalFactor, type Player, type Tactic } from 'sim-engine';
import type { NewsItem } from './Game';
import { money, wage } from './format';

type GameT = ReturnType<typeof Engine.resumeGame>;
type Action = (result: { ok: boolean; message: string }) => void;

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 } as const;

function moodPill(mood: BoardStatus['mood']) {
  const cls = mood === 'delighted' ? 'good' : mood === 'content' ? '' : mood === 'concerned' ? 'warn' : 'bad';
  return <span className={`pill ${cls}`}>{mood}</span>;
}

export function OverviewPanel({ game, clubId, board, news, lastResults, nextFixture }: { game: GameT; clubId: string; board: BoardStatus | null; news: NewsItem[]; lastResults: string[]; nextFixture?: Fixture }) {
  const { world } = game;
  const [selected, setSelected] = useState<string | null>(lastResults[0] ?? null);
  const last = lastResults.map((id) => world.fixtures[id]);
  const opp = (f: Fixture) => (f.homeClubId === clubId ? world.clubs[f.awayClubId] : world.clubs[f.homeClubId]);
  return (
    <div className="grid-2">
      <div className="stack">
        {board ? (
          <div className="tiles">
            <div className="tile"><div className="v">{board.position}{ord(board.position)}</div><div className="k">League position</div><div className="sub">target {board.target}{ord(board.target)}</div></div>
            <div className="tile"><div className="v">{board.formPoints}</div><div className="k">Form (last 6)</div><div className="sub">{world.clubs[clubId].form.map((p) => (p === 3 ? 'W' : p === 1 ? 'D' : 'L')).join(' ') || '–'}</div></div>
            <div className="tile"><div className="v">{money(board.balance)}</div><div className="k">Bank</div><div className="sub">{board.windowOpen ? 'window open' : 'window closed'}</div></div>
            <div className="tile"><div className="v">{moodPill(board.mood)}</div><div className="k">Board</div><div className="sub">{board.note}</div></div>
          </div>
        ) : null}
        <section className="panel">
          <header><h3>Next match</h3></header>
          <div className="body">
            {nextFixture ? (
              <p><b>{world.clubs[nextFixture.homeClubId].name}</b> v <b>{world.clubs[nextFixture.awayClubId].name}</b> · {world.competitions[nextFixture.competitionId].name} · day {nextFixture.day - world.seasonStartDay} · {opp(nextFixture).name} are {oppStrength(game, clubId, opp(nextFixture).id)}</p>
            ) : <p className="muted">No more fixtures this season.</p>}
          </div>
        </section>
        <section className="panel">
          <header><h3>Latest result</h3></header>
          {last.length === 0 ? <p className="empty">Play to your first match to see a report.</p> : (
            <div className="body">
              {last.map((f) => <MatchReportView key={f.id} game={game} fixture={f} open={selected === f.id || last.length === 1} onToggle={() => setSelected(selected === f.id ? null : f.id)} />)}
            </div>
          )}
        </section>
      </div>
      <section className="panel">
        <header><h3>Inbox</h3></header>
        <ul className="news">
          {news.length === 0 ? <li className="empty">Transfers, injuries, board messages and results land here.</li> : news.map((n, i) => <li key={i}><span className="d">S{n.season} d{n.day}</span>{n.text}</li>)}
        </ul>
      </section>
    </div>
  );
}

function oppStrength(game: GameT, mine: string, theirs: string): string {
  const w = game.world;
  const a = Engine.squad(w, mine), b = Engine.squad(w, theirs);
  const avg = (ps: Player[]) => ps.map((p) => Engine.overall(p)).sort((x, y) => y - x).slice(0, 11).reduce((s, x) => s + x, 0) / 11;
  const d = avg(b) - avg(a);
  return d > 4 ? 'clearly stronger' : d > 1.5 ? 'a bit stronger' : d < -4 ? 'clearly weaker' : d < -1.5 ? 'a bit weaker' : 'about level';
}

export function MatchReportView({ game, fixture, open, onToggle }: { game: GameT; fixture: Fixture; open: boolean; onToggle?: () => void }) {
  const w = game.world;
  const r = fixture.report;
  const h = w.clubs[fixture.homeClubId], a = w.clubs[fixture.awayClubId];
  if (!r) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="score" onClick={onToggle} style={{ cursor: onToggle ? 'pointer' : 'default' }}><span>{h.name}</span><b>{fixture.homeGoals}–{fixture.awayGoals}</b><span>{a.name}</span></p>
      <p className="muted">{w.competitions[fixture.competitionId].name} · {r.homeFormation} v {r.awayFormation} · attendance {r.attendance.toLocaleString('en-GB')} · expected goals {r.lambda.home.toFixed(2)} v {r.lambda.away.toFixed(2)}{r.penalties ? ` · penalties ${r.penalties.home}–${r.penalties.away}` : ''}</p>
      {open ? (
        <>
          <p className="side">{h.short} factors</p><FactorBars factors={r.factors.home} />
          <p className="side">{a.short} factors</p><FactorBars factors={r.factors.away} />
          {r.goals.length ? <ol className="goals">{r.goals.map((g, i) => <li key={i}><span className="min">{g.minute}&apos;</span><span className="who">{w.clubs[g.clubId].short}</span>{w.players[g.scorerId]?.name ?? g.scorerId}{g.assistId ? <span className="muted"> ({w.players[g.assistId]?.name})</span> : null}</li>)}</ol> : <p className="muted">Goalless.</p>}
        </>
      ) : null}
    </div>
  );
}

export function FactorBars({ factors }: { factors: GoalFactor[] }) {
  const W = 420, rowH = 22, mid = 220, half = 120, padT = 4;
  const rows = factors.filter((f) => f.name !== 'base');
  const H = padT + rows.length * rowH + 4;
  const scale = (m: number) => Math.max(-half, Math.min(half, Math.log(m) * 180));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Goal factors">
      <line x1={mid} x2={mid} y1={0} y2={H} stroke="var(--rule)" />
      {rows.map((f, i) => {
        const y = padT + i * rowH, dx = scale(f.multiplier);
        return (
          <g key={f.name}>
            <text className="tick" x={mid - half - 8} y={y + 15} textAnchor="end">{f.name}</text>
            <rect x={dx >= 0 ? mid : mid + dx} y={y + 5} width={Math.abs(dx)} height={rowH - 10} rx={2} fill={f.multiplier >= 1 ? 'var(--up)' : 'var(--down)'}><title>{f.note}</title></rect>
            <text className="label" x={mid + half + 8} y={y + 15}>x{f.multiplier.toFixed(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function SquadPanel({ game, clubId, onAction }: { game: GameT; clubId: string; onAction: Action }) {
  const { world, ctx } = game;
  const [renewing, setRenewing] = useState<string | null>(null);
  const [years, setYears] = useState(2);
  const [offer, setOffer] = useState(0);
  const players = useMemo(() => Engine.squad(world, clubId).slice().sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || Engine.overall(b) - Engine.overall(a)), [world, clubId, world.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const xi = new Set(Engine.selectXI(world, clubId, world.clubs[clubId].tactic).playerIds);
  const terms = renewing ? Engine.renewalTerms(ctx, renewing) : null;
  const expiringCount = players.filter((p) => { const c = Engine.contractOf(world, p.id); return c && c.endSeason === world.season; }).length;
  return (
    <section className="panel">
      <header><h3>Squad</h3><span className="muted">{players.length} players · XI marked for the current tactic{expiringCount ? ` · ${expiringCount} contract${expiringCount === 1 ? '' : 's'} expiring this season` : ''}</span></header>
      <div className="scroll">
        <table>
          <thead><tr><th></th><th>Player</th><th>Pos</th><th className="num">Age</th><th className="num">Ovr</th><th className="num">Pot</th><th className="num">Fit</th><th className="num">Morale</th><th className="num">Apps</th><th className="num">G</th><th className="num">A</th><th className="num">Value</th><th className="num">Wage</th><th className="num">Until</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {players.map((p) => {
              const c = Engine.contractOf(world, p.id);
              const expiring = c && c.endSeason === world.season;
              return (
                <tr key={p.id} className={xi.has(p.id) ? 'mine' : ''}>
                  <td className="mono">{xi.has(p.id) ? 'XI' : ''}</td>
                  <td>{p.name}</td>
                  <td>{p.position}</td>
                  <td className="num">{p.age}</td>
                  <td className="num">{Math.round(Engine.overall(p))}</td>
                  <td className="num">{p.potential}</td>
                  <td className="num">{Math.round(p.fitness)}</td>
                  <td className="num">{p.morale}</td>
                  <td className="num">{p.stats.apps}</td>
                  <td className="num">{p.stats.goals}</td>
                  <td className="num">{p.stats.assists}</td>
                  <td className="num">{money(p.value)}</td>
                  <td className="num">{c ? wage(c.wage) : '–'}</td>
                  <td className="num">{c ? `S${c.endSeason}` : '–'}</td>
                  <td>
                    {p.injuryDays > 0 ? <span className="pill bad">injured {p.injuryDays}d</span> : null}{' '}
                    {p.loan ? <span className="pill">on loan</span> : null}{' '}
                    {p.listedAt !== null ? <span className="pill warn">listed {money(p.listedAt)}</span> : null}{' '}
                    {expiring ? <span className="pill warn">expiring</span> : null}
                  </td>
                  <td>
                    <div className="inline-form">
                      {renewing === p.id && terms ? (
                        <>
                          <span className="muted">{terms.note}</span>
                          {terms.willing ? (
                            <>
                              <input type="number" min={1} max={terms.maxYears} value={Math.min(years, terms.maxYears)} onChange={(e) => setYears(Number(e.target.value))} aria-label="Years" />
                              <input type="number" min={1} value={offer || terms.wage} onChange={(e) => setOffer(Number(e.target.value))} aria-label="Weekly wage (k)" />
                              <button className="btn small primary" onClick={() => { onAction(Engine.renewContract(ctx, p.id, years, offer || terms.wage)); setRenewing(null); setOffer(0); }}>Offer</button>
                            </>
                          ) : null}
                          <button className="btn small" onClick={() => setRenewing(null)}>Close</button>
                        </>
                      ) : (
                        <>
                          {!p.loan ? <button className="btn small" onClick={() => { setRenewing(p.id); setOffer(0); }}>Renew</button> : null}
                          {p.listedAt === null ? <button className="btn small" onClick={() => onAction(Engine.listPlayer(ctx, p.id, p.value))}>List</button> : <button className="btn small" onClick={() => onAction(Engine.unlistPlayer(ctx, p.id))}>Unlist</button>}
                          {!p.loan ? <button className="btn small danger" onClick={() => { if (confirm(`Release ${p.name}? Half the remaining wages are paid off.`)) onAction(Engine.releasePlayer(ctx, p.id)); }}>Release</button> : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MarketPanel({ game, clubId, onAction }: { game: GameT; clubId: string; onAction: Action }) {
  const { world, ctx } = game;
  const [years, setYears] = useState(3);
  const [premium, setPremium] = useState(0);
  const [pos, setPos] = useState<'ALL' | Player['position']>('ALL');
  const [onlyAffordable, setOnlyAffordable] = useState(true);
  const entries = useMemo(() => Engine.marketForHuman(ctx), [ctx, world.day, world.clubs[clubId].transferBudget]); // eslint-disable-line react-hooks/exhaustive-deps
  const board = Engine.boardStatus(ctx);
  const shown = entries.filter((e) => (pos === 'ALL' || e.player.position === pos) && (!onlyAffordable || e.affordable)).slice(0, 80);
  return (
    <section className="panel">
      <header>
        <h3>Transfer market</h3>
        <span className="muted">{board?.windowOpen ? 'Window open' : 'Window closed: opens in pre-season and mid-season'} · budget {money(board?.transferBudget ?? 0)} · wage room {wage((board?.wageBudget ?? 0) - (board?.wageBill ?? 0))}</span>
      </header>
      <div className="body form-row">
        <div className="field"><label htmlFor="pos">Position</label><select id="pos" value={pos} onChange={(e) => setPos(e.target.value as typeof pos)}><option value="ALL">All</option><option>GK</option><option>DF</option><option>MF</option><option>FW</option></select></div>
        <div className="field"><label htmlFor="years">Contract years</label><select id="years" value={years} onChange={(e) => setYears(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
        <div className="field"><label htmlFor="premium">Offer</label><select id="premium" value={premium} onChange={(e) => setPremium(Number(e.target.value))}><option value={0}>Asking price</option><option value={10}>Asking +10% (more likely to accept)</option><option value={25}>Asking +25%</option></select></div>
        <label className="muted"><input type="checkbox" checked={onlyAffordable} onChange={(e) => setOnlyAffordable(e.target.checked)} /> Affordable only</label>
      </div>
      <div className="scroll">
        <table>
          <thead><tr><th>Player</th><th>From</th><th>Pos</th><th className="num">Age</th><th className="num">Ovr</th><th className="num">Pot</th><th className="num">Asking</th><th className="num">Wage</th><th></th></tr></thead>
          <tbody>
            {shown.length === 0 ? <tr><td colSpan={9} className="empty">Nothing matches. Widen the filters or wait for the window.</td></tr> : shown.map((e) => (
              <tr key={e.player.id}>
                <td>{e.player.name}</td>
                <td>{e.fromClubName}</td>
                <td>{e.player.position}</td>
                <td className="num">{e.player.age}</td>
                <td className="num">{Math.round(Engine.overall(e.player))}</td>
                <td className="num">{e.player.potential}</td>
                <td className="num">{e.askingPrice ? money(e.askingPrice) : 'free'}</td>
                <td className="num">{wage(e.wage)}</td>
                <td>{e.affordable ? <button className="btn small primary" onClick={() => onAction(Engine.bidForPlayer(ctx, e.player.id, years, Math.round(e.askingPrice * (1 + premium / 100))))}>Bid{premium ? ` ${money(Math.round(e.askingPrice * (1 + premium / 100)))}` : ''}</button> : <span className="muted">{e.reason}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const TACTICS: { id: Tactic; name: string; shape: string; blurb: string }[] = [
  { id: 'balanced', name: 'Balanced', shape: '4-4-2', blurb: 'Even attack and defence. The safe default.' },
  { id: 'attacking', name: 'Attacking', shape: '4-3-3', blurb: 'About 12% more expected goals for you, and 12% more for them.' },
  { id: 'defensive', name: 'Defensive', shape: '5-4-1', blurb: 'About 14% fewer goals conceded, 12% fewer scored. For protecting a lead or a weak squad.' },
];

export function TacticsPanel({ game, clubId, onAction }: { game: GameT; clubId: string; onAction: Action }) {
  const { world, ctx } = game;
  const club = world.clubs[clubId];
  const sel = Engine.selectXI(world, clubId, club.tactic);
  return (
    <div className="grid-2">
      <section className="panel">
        <header><h3>Shape</h3><span className="muted">current: {club.tactic}</span></header>
        <div className="body stack">
          {TACTICS.map((t) => (
            <label key={t.id} className="card" style={{ cursor: 'pointer', borderColor: club.tactic === t.id ? 'var(--accent)' : undefined }}>
              <div className="actions"><input type="radio" name="tactic" checked={club.tactic === t.id} onChange={() => onAction(Engine.setTactic(ctx, t.id))} /><h3 style={{ margin: 0 }}>{t.name} <span className="mono muted">{t.shape}</span></h3></div>
              <p className="muted" style={{ margin: 0 }}>{t.blurb}</p>
            </label>
          ))}
        </div>
      </section>
      <section className="panel">
        <header><h3>Starting XI</h3><span className="muted">{sel.formation}, best available by rating, fitness and form</span></header>
        <div className="scroll">
          <table>
            <thead><tr><th>Slot</th><th>Player</th><th className="num">Rating</th><th className="num">Fit</th></tr></thead>
            <tbody>
              {(['GK', 'DF', 'MF', 'FW'] as const).flatMap((pos) => sel.byPos[pos].map((s) => { const p = world.players[s.playerId]; return <tr key={s.playerId}><td>{pos}</td><td>{p.name}{p.position !== pos ? <span className="muted"> (out of position)</span> : null}</td><td className="num">{s.rating.toFixed(1)}</td><td className="num">{Math.round(p.fitness)}</td></tr>; }))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function FixturesPanel({ game, clubId, fixtures }: { game: GameT; clubId: string; fixtures: Fixture[] }) {
  const { world } = game;
  const [open, setOpen] = useState<string | null>(null);
  const opened = open ? world.fixtures[open] : null;
  return (
    <div className="grid-2">
      <section className="panel">
        <header><h3>Fixtures and results</h3><span className="muted">season {world.season}</span></header>
        <ul className="rows">
          {fixtures.map((f) => {
            const home = f.homeClubId === clubId;
            const res = f.played ? (f.winnerId === clubId ? 'W' : f.winnerId === null ? 'D' : 'L') : '';
            return (
              <li key={f.id} aria-selected={open === f.id} onClick={() => f.played && setOpen(f.id)} style={{ cursor: f.played ? 'pointer' : 'default' }}>
                <span className="h">{world.clubs[f.homeClubId].name}</span>
                <span className="s">{f.played ? `${f.homeGoals}–${f.awayGoals}` : 'v'}</span>
                <span>{world.clubs[f.awayClubId].name}</span>
                <span className="meta">day {f.day - world.seasonStartDay} · {world.competitions[f.competitionId].name} · {home ? 'home' : 'away'}{res ? ` · ${res}` : ''}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="panel">
        <header><h3>Match report</h3></header>
        <div className="body">{opened ? <MatchReportView game={game} fixture={opened} open /> : <p className="muted">Pick a played match.</p>}</div>
      </section>
    </div>
  );
}

export function TablePanel({ game, clubId }: { game: GameT; clubId: string }) {
  const { world } = game;
  const leagues = Object.values(world.competitions).filter((c) => c.kind === 'league' && c.season === world.season).sort((a, b) => (a.kind === 'league' && b.kind === 'league' ? a.tier - b.tier : 0));
  const mine = world.clubs[clubId].leagueId;
  const [compId, setCompId] = useState(mine);
  const comp = world.competitions[leagues.some((l) => l.id === compId) ? compId : mine];
  if (!comp || comp.kind !== 'league') return <p className="empty">No league running.</p>;
  const table = Engine.computeTable(world, comp);
  const n = comp.clubIds.length;
  return (
    <section className="panel">
      <header><h3>{comp.name}</h3><div className="tabs" style={{ margin: 0, border: 0 }}>{leagues.map((l) => <button key={l.id} role="tab" aria-selected={comp.id === l.id} onClick={() => setCompId(l.id)}>{l.name}</button>)}</div></header>
      <div className="scroll">
        <table>
          <thead><tr><th className="num">#</th><th>Club</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GF</th><th className="num">GA</th><th className="num">GD</th><th className="num">Pts</th><th>Manager</th></tr></thead>
          <tbody>
            {table.map((r) => {
              const c = world.clubs[r.clubId];
              const cls = [r.clubId === clubId ? 'mine' : '', comp.promote > 0 && r.position <= comp.promote ? 'zone-up' : comp.relegate > 0 && r.position > n - comp.relegate ? 'zone-down' : ''].join(' ');
              return <tr key={r.clubId} className={cls}><td className="num">{r.position}</td><td>{c.name}</td><td className="num">{r.played}</td><td className="num">{r.won}</td><td className="num">{r.drawn}</td><td className="num">{r.lost}</td><td className="num">{r.gf}</td><td className="num">{r.ga}</td><td className="num">{r.gd > 0 ? '+' : ''}{r.gd}</td><td className="num pts">{r.points}</td><td className="muted">{c.managerId ? world.managers[c.managerId].name : 'vacant'}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FinancesPanel({ game, clubId, board }: { game: GameT; clubId: string; board: BoardStatus | null }) {
  const { world } = game;
  const club = world.clubs[clubId];
  const ledger = Object.entries(club.ledger).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return (
    <div className="stack">
      <div className="tiles">
        <div className="tile"><div className="v">{money(club.balance)}</div><div className="k">Bank</div></div>
        <div className="tile"><div className="v">{wage(board?.wageBill ?? 0)}</div><div className="k">Wage bill</div><div className="sub">budget {wage(board?.wageBudget ?? 0)}</div></div>
        <div className="tile"><div className="v">{money(board?.transferBudget ?? 0)}</div><div className="k">Transfer budget</div></div>
        <div className="tile"><div className="v">{club.stadiumCapacity.toLocaleString('en-GB')}</div><div className="k">Stadium</div><div className="sub">reputation {club.reputation}</div></div>
      </div>
      <section className="panel">
        <header><h3>This season</h3></header>
        <div className="scroll">
          <table>
            <thead><tr><th>Category</th><th className="num">Total</th></tr></thead>
            <tbody>{ledger.length === 0 ? <tr><td colSpan={2} className="empty">Nothing posted yet this season.</td></tr> : ledger.map(([k, v]) => <tr key={k}><td>{k.replace('_', ' ')}</td><td className="num">{money(v)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ord(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

'use client';
import { useMemo, useState } from 'react';
import Engine, { type Fixture, type GoalFactor, type Player } from 'sim-engine';
import { money, wage, ord } from '../format';

export type GameT = ReturnType<typeof Engine.resumeGame>;
export type Action = (result: { ok: boolean; message: string }) => void;
export const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 } as const;

export { Crest, Flag, Mark, Logo, FlagDefs } from '../marks';
import { Flag } from '../marks';

export function Ovr({ v }: { v: number }) {
  const n = Math.round(v);
  const cls = n >= 85 ? 'elite' : n >= 75 ? 'good' : n >= 65 ? 'ok' : 'low';
  return <span className={`ovr ${cls}`}>{n}</span>;
}

/** Share of a pair, for the bar behind a stat row. */
const pct = (home: number, away: number): number => (home + away === 0 ? 50 : Math.round((home / (home + away)) * 100));

function StatRow({ label, home, away, bar }: { label: string; home: number | string; away: number | string; bar: number }) {
  return (
    <div className="statrow">
      <b>{home}</b>
      <span className="mid">
        <i>{label}</i>
        <span className="track"><em style={{ width: `${bar}%` }} /></span>
      </span>
      <b>{away}</b>
    </div>
  );
}

export function MatchReportView({ game, fixture, open, onToggle, onPlayer }: { game: GameT; fixture: Fixture; open: boolean; onToggle?: () => void; onPlayer?: (id: string) => void }) {
  const w = game.world;
  const r = fixture.report;
  const h = w.clubs[fixture.homeClubId], a = w.clubs[fixture.awayClubId];
  if (!r) return null;
  const hasFactors = r.factors.home.length > 0;
  return (
    <div className="report">
      <p className="score" onClick={onToggle} style={{ cursor: onToggle ? 'pointer' : 'default' }}><span>{h.name}</span><b>{fixture.homeGoals}–{fixture.awayGoals}</b><span>{a.name}</span></p>
      <p className="muted">{w.competitions[fixture.competitionId]?.name ?? fixture.competitionId} · {r.homeFormation} v {r.awayFormation} · att {r.attendance.toLocaleString('en-GB')} · xG {r.lambda.home.toFixed(2)} v {r.lambda.away.toFixed(2)}{r.penalties ? ` · pens ${r.penalties.home}–${r.penalties.away}` : ''}{r.derby ? <> · <span className="pill hot">derby</span></> : null}</p>
      {open ? (
        <>
          {r.goals.length ? <ol className="goals">{r.goals.map((g, i) => <li key={i}><span className="min">{g.minute}&apos;</span><span className="who">{w.clubs[g.clubId].short}</span><a onClick={() => onPlayer?.(g.scorerId)}>{w.players[g.scorerId]?.name ?? 'unknown'}</a>{g.assistId ? <span className="muted"> (assist {w.players[g.assistId]?.name})</span> : null}</li>)}</ol> : <p className="muted">Goalless.</p>}
          {r.stats ? (
            <div className="matchstats">
              <StatRow label="Possession" home={`${r.stats.possession.home}%`} away={`${r.stats.possession.away}%`} bar={r.stats.possession.home} />
              <StatRow label="Shots" home={r.stats.shots.home} away={r.stats.shots.away} bar={pct(r.stats.shots.home, r.stats.shots.away)} />
              <StatRow label="On target" home={r.stats.onTarget.home} away={r.stats.onTarget.away} bar={pct(r.stats.onTarget.home, r.stats.onTarget.away)} />
              <StatRow label="Corners" home={r.stats.corners.home} away={r.stats.corners.away} bar={pct(r.stats.corners.home, r.stats.corners.away)} />
              {r.motmId && w.players[r.motmId] ? (
                <p className="motm">Man of the match <a onClick={() => onPlayer?.(r.motmId!)}>{w.players[r.motmId].name}</a></p>
              ) : null}
            </div>
          ) : null}
          {r.cards.length ? (
            <ul className="cards-list">
              {r.cards.map((c, i) => (
                <li key={i}>
                  <span className="min">{c.minute}&apos;</span>
                  <i className={c.kind === 'yellow' ? 'card-y' : 'card-r'} aria-hidden />
                  <span className="who">{w.clubs[c.clubId].short}</span>
                  <a onClick={() => onPlayer?.(c.playerId)}>{w.players[c.playerId]?.name ?? c.playerId}</a>
                  <span className="muted">{c.kind === 'yellow' ? 'booked' : c.kind === 'second' ? 'second yellow' : 'sent off'}{c.ban ? ` · ${c.ban} match ban` : ''}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {hasFactors ? (
            <>
              <p className="side">{h.short} factors</p><FactorBars factors={r.factors.home} />
              <p className="side">{a.short} factors</p><FactorBars factors={r.factors.away} />
            </>
          ) : null}
          <div className="xi-grid">
            <div><p className="side">{h.short} XI</p><ul className="plain">{r.homeXI.map((id) => <li key={id}><a onClick={() => onPlayer?.(id)}>{w.players[id]?.name ?? id}</a></li>)}</ul></div>
            <div><p className="side">{a.short} XI</p><ul className="plain">{r.awayXI.map((id) => <li key={id}><a onClick={() => onPlayer?.(id)}>{w.players[id]?.name ?? id}</a></li>)}</ul></div>
          </div>
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

function AttrBar({ label, v }: { label: string; v: number }) {
  return <div className="attr"><span>{label}</span><i><b style={{ width: `${Math.min(100, v)}%` }} /></i><span className="mono">{Math.round(v)}</span></div>;
}

/** Full player card with scouting, contract, stats, and the actions the manager can take. */
export function PlayerDrawer({ game, playerId, clubId, onClose, onAction }: { game: GameT; playerId: string; clubId: string; onClose: () => void; onAction: Action }) {
  const { world, ctx } = game;
  const p: Player | undefined = world.players[playerId];
  const [years, setYears] = useState(3);
  const [offer, setOffer] = useState<number | null>(null);
  const [renewYears, setRenewYears] = useState(2);
  const [renewWage, setRenewWage] = useState<number | null>(null);
  const [askPrice, setAskPrice] = useState<number | null>(null);
  const market = useMemo(() => (p && p.clubId !== clubId ? Engine.marketForHuman(ctx).find((m) => m.player.id === playerId) ?? null : null), [ctx, playerId, p, clubId, world.day]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  const club = p.clubId ? world.clubs[p.clubId] : null;
  const cur = Engine.currencyFor(world, p.clubId ?? clubId);
  const c = Engine.contractOf(world, p.id);
  const scout = Engine.scoutReport(world, p.id);
  const mine = p.clubId === clubId;
  const terms = mine ? Engine.renewalTerms(ctx, p.id) : null;
  const avg = Engine.averageRating(p);
  const news = Engine.newsFeed(world, { playerId: p.id, limit: 5 });
  const bid = world.pendingBids.find((b) => b.playerId === p.id);
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label={p.name}>
        <header>
          <div>
            <p className="eyebrow">{p.position} · <Flag nat={p.nationality} /> · {p.age} years</p>
            <h2>{p.name}</h2>
            <p className="muted">{club ? `${club.name} · ${Engine.leagueOf(world, club.id)?.name ?? ''}` : 'Free agent'}{p.loan ? ' · on loan' : ''}{p.injuryDays > 0 ? ` · injured (${p.injuryDays} days)` : ''}{p.suspension > 0 ? ` · suspended (${p.suspension} match${p.suspension === 1 ? '' : 'es'})` : ''}</p>
          </div>
          <button className="btn small" onClick={onClose}>Close</button>
        </header>
        <div className="drawer-body stack">
          <div className="tiles">
            <div className="tile"><div className="v"><Ovr v={Engine.overall(p)} /></div><div className="k">Overall</div><div className="sub">potential {scout.potentialLow}–{scout.potentialHigh}</div></div>
            <div className="tile"><div className="v">{money(p.value, cur)}</div><div className="k">Value</div><div className="sub">{c ? `${wage(c.wage, cur)} to S${c.endSeason}` : 'no contract'}</div></div>
            <div className="tile"><div className="v">{p.stats.apps}</div><div className="k">Apps</div><div className="sub">{p.stats.goals} goals · {p.stats.assists} assists · {p.stats.yellows}Y {p.stats.reds}R</div></div>
            <div className="tile"><div className="v">{avg ? avg.toFixed(2) : '–'}</div><div className="k">Avg rating</div><div className="sub">morale {p.morale} · fitness {Math.round(p.fitness)}</div></div>
          </div>
          <section>
            <p className="side">Attributes</p>
            <AttrBar label="Pace" v={p.attrs.pace} /><AttrBar label="Technique" v={p.attrs.technique} /><AttrBar label="Physical" v={p.attrs.physical} /><AttrBar label="Mental" v={p.attrs.mental} />{p.position === 'GK' ? <AttrBar label="Goalkeeping" v={p.attrs.goalkeeping} /> : null}
          </section>
          <section>
            <p className="side">Scout report</p>
            <p>{scout.verdict} Strengths: {scout.strengths.join(', ')}. Weaknesses: {scout.weaknesses.join(', ')}. Career: {p.career.apps} apps, {p.career.goals} goals.</p>
          </section>
          {mine ? (
            <section className="stack">
              <p className="side">Contract</p>
              {terms ? (
                <div className="inline-form">
                  <span className="muted">{terms.note}</span>
                  {terms.willing ? (
                    <>
                      <input type="number" min={1} max={terms.maxYears} value={Math.min(renewYears, terms.maxYears)} onChange={(e) => setRenewYears(Number(e.target.value))} aria-label="Years" />
                      <input type="number" min={1} step={terms.wage >= 100 ? 10 : 1} value={renewWage ?? terms.wage} onChange={(e) => setRenewWage(Number(e.target.value))} aria-label="Weekly wage (k)" />
                      <button className="btn small primary" onClick={() => onAction(Engine.renewContract(ctx, p.id, renewYears, renewWage ?? terms.wage))}>Offer new deal</button>
                    </>
                  ) : null}
                </div>
              ) : null}
              <p className="side">Transfer</p>
              <div className="inline-form">
                {p.listedAt === null ? (
                  <>
                    <input type="number" min={0} step={p.value >= 1000 ? 100 : 10} value={askPrice ?? p.value} onChange={(e) => setAskPrice(Number(e.target.value))} aria-label="Asking price (k)" />
                    <button className="btn small" onClick={() => onAction(Engine.listPlayer(ctx, p.id, askPrice ?? p.value))} disabled={!!p.loan}>List for sale</button>
                  </>
                ) : <button className="btn small" onClick={() => onAction(Engine.unlistPlayer(ctx, p.id))}>Take off the market ({money(p.listedAt, cur)})</button>}
                {!p.loan ? <button className="btn small danger" onClick={() => { if (confirm(`Release ${p.name}? Half the remaining wages are paid off.`)) { onAction(Engine.releasePlayer(ctx, p.id)); onClose(); } }}>Release</button> : null}
              </div>
              {bid ? <p className="notice">{world.clubs[bid.toClubId].name} have bid {money(bid.fee, cur)}. Answer it under Transfers → Offers.</p> : null}
            </section>
          ) : (
            <section className="stack">
              <p className="side">Sign him</p>
              {market ? (
                <div className="inline-form">
                  <span className="muted">Asking {market.askingPrice ? money(market.askingPrice, cur) : 'free'} · wage {wage(market.wage, cur)}</span>
                  <select value={years} onChange={(e) => setYears(Number(e.target.value))} aria-label="Contract years">{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y} yr</option>)}</select>
                  <input type="number" min={market.askingPrice} step={market.askingPrice >= 1000 ? 100 : 10} value={offer ?? market.askingPrice} onChange={(e) => setOffer(Number(e.target.value))} aria-label="Offer (k)" />
                  {market.affordable ? <button className="btn small primary" onClick={() => { onAction(Engine.bidForPlayer(ctx, p.id, years, offer ?? market.askingPrice)); onClose(); }}>Bid {money(offer ?? market.askingPrice, cur)}</button> : <span className="pill warn">{market.reason}</span>}
                </div>
              ) : <p className="muted">{club ? `${club.name} are not selling right now. Players become available when surplus, unsettled, or out of contract.` : 'Free agents appear on the market when the window is open.'}</p>}
            </section>
          )}
          {news.length ? <section><p className="side">In the news</p><ul className="news">{news.map((n) => <li key={n.id}><span className="d">S{n.season} d{n.day - world.seasonStartDay}</span>{n.headline}</li>)}</ul></section> : null}
        </div>
      </aside>
    </div>
  );
}

export function FormDots({ form }: { form: number[] }) {
  return <span className="form">{form.length === 0 ? <span className="muted">–</span> : form.map((p, i) => <i key={i} className={p === 3 ? 'w' : p === 1 ? 'd' : 'l'}>{p === 3 ? 'W' : p === 1 ? 'D' : 'L'}</i>)}</span>;
}

export function oppStrength(game: GameT, mine: string, theirs: string): string {
  const w = game.world;
  const d = Engine.squadStrength(w, theirs) - Engine.squadStrength(w, mine);
  return d > 5 ? 'clearly stronger' : d > 2 ? 'a bit stronger' : d < -5 ? 'clearly weaker' : d < -2 ? 'a bit weaker' : 'about level';
}

export { ord };

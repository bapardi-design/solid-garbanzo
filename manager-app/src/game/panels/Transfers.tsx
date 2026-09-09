'use client';
import { useMemo, useState } from 'react';
import Engine, { type Player, type PlayerQuery } from 'sim-engine';
import { money, wage } from '../format';
import { Flag, Ovr, type Action, type GameT } from './shared';

type Sub = 'market' | 'scouting' | 'offers' | 'history';

export function TransfersPanel({ game, clubId, onAction, onPlayer }: { game: GameT; clubId: string; onAction: Action; onPlayer: (id: string) => void }) {
  const [sub, setSub] = useState<Sub>('market');
  const { world } = game;
  const bids = world.pendingBids.length;
  return (
    <div className="stack">
      <div className="tabs sub" role="tablist">
        {(['market', 'scouting', 'offers', 'history'] as Sub[]).map((s) => <button key={s} role="tab" aria-selected={sub === s} onClick={() => setSub(s)}>{s === 'offers' && bids ? `Offers (${bids})` : s[0].toUpperCase() + s.slice(1)}</button>)}
      </div>
      {sub === 'market' ? <Market game={game} clubId={clubId} onAction={onAction} onPlayer={onPlayer} /> : null}
      {sub === 'scouting' ? <Scouting game={game} clubId={clubId} onPlayer={onPlayer} /> : null}
      {sub === 'offers' ? <Offers game={game} clubId={clubId} onAction={onAction} onPlayer={onPlayer} /> : null}
      {sub === 'history' ? <History game={game} clubId={clubId} onPlayer={onPlayer} /> : null}
    </div>
  );
}

function Market({ game, clubId, onAction, onPlayer }: { game: GameT; clubId: string; onAction: Action; onPlayer: (id: string) => void }) {
  const { world, ctx } = game;
  const cur = Engine.currencyFor(world, clubId);
  const [pos, setPos] = useState<'ALL' | Player['position']>('ALL');
  const [onlyAffordable, setOnlyAffordable] = useState(() => Engine.inTransferWindow(world));
  const [text, setText] = useState('');
  const entries = useMemo(() => Engine.marketForHuman(ctx), [ctx, world.day, world.clubs[clubId].transferBudget]); // eslint-disable-line react-hooks/exhaustive-deps
  const board = Engine.boardStatus(ctx);
  const q = text.trim().toLowerCase();
  const shown = entries.filter((e) => (pos === 'ALL' || e.player.position === pos) && (!onlyAffordable || e.affordable) && (!q || e.player.name.toLowerCase().includes(q) || e.fromClubName.toLowerCase().includes(q))).slice(0, 120);
  const signed = Engine.signingsThisWindow(world, clubId);
  return (
    <section className="panel">
      <header>
        <h3>Market</h3>
        <span className="muted">{board?.windowOpen ? `Window open · ${signed} signed this window` : `Window closed · opens on day ${Engine.SUMMER_WINDOW[0]} and ${Engine.WINTER_WINDOW[0]}`} · budget {money(board?.transferBudget ?? 0, cur)} · wage room {wage((board?.wageBudget ?? 0) - (board?.wageBill ?? 0), cur)}</span>
      </header>
      <div className="body form-row">
        <div className="field"><label htmlFor="mk-text">Search</label><input id="mk-text" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="player or club" /></div>
        <div className="field"><label htmlFor="pos">Position</label><select id="pos" value={pos} onChange={(e) => setPos(e.target.value as typeof pos)}><option value="ALL">All</option><option>GK</option><option>DF</option><option>MF</option><option>FW</option></select></div>
        <label className="muted"><input type="checkbox" checked={onlyAffordable} onChange={(e) => setOnlyAffordable(e.target.checked)} /> Affordable only</label>
        <span className="muted">Click a player for the scout report and to bid.</span>
      </div>
      <div className="scroll">
        <table>
          <thead><tr><th>Player</th><th>From</th><th>Pos</th><th>Nat</th><th className="num">Age</th><th className="num">Ovr</th><th className="num">Pot</th><th className="num">Asking</th><th className="num">Wage</th><th></th></tr></thead>
          <tbody>
            {shown.length === 0 ? <tr><td colSpan={10} className="empty">Nothing matches. Widen the filters, scout the world, or wait for the window.</td></tr> : shown.map((e) => {
              const sc = Engine.scoutReport(world, e.player.id);
              return (
                <tr key={e.player.id} onClick={() => onPlayer(e.player.id)} style={{ cursor: 'pointer' }}>
                  <td><a>{e.player.name}</a></td>
                  <td>{e.fromClubName}</td>
                  <td>{e.player.position}</td>
                  <td><Flag nat={e.player.nationality} /></td>
                  <td className="num">{e.player.age}</td>
                  <td className="num"><Ovr v={Engine.overall(e.player)} /></td>
                  <td className="num muted">{sc.potentialLow}–{sc.potentialHigh}</td>
                  <td className="num">{e.askingPrice ? money(e.askingPrice, cur) : 'free'}</td>
                  <td className="num">{wage(e.wage, cur)}</td>
                  <td onClick={(ev) => ev.stopPropagation()}>{e.affordable ? <button className="btn small primary" onClick={() => onAction(Engine.bidForPlayer(ctx, e.player.id, 3, e.askingPrice))}>Bid asking</button> : <span className="muted">{e.reason}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Scouting({ game, clubId, onPlayer }: { game: GameT; clubId: string; onPlayer: (id: string) => void }) {
  const { world } = game;
  const cur = Engine.currencyFor(world, clubId);
  const [q, setQ] = useState<PlayerQuery>({ pos: 'ALL', minOverall: 60, maxAge: 34, sort: 'overall', limit: 100 });
  const [ran, setRan] = useState<PlayerQuery>(q);
  const hits = useMemo(() => Engine.searchPlayers(world, ran), [world, ran, world.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const nations = Object.values(world.nations);
  const set = (patch: Partial<PlayerQuery>) => setQ((cur) => ({ ...cur, ...patch }));
  return (
    <section className="panel">
      <header><h3>Scouting network</h3><span className="muted">{hits.length} players found · every player in the world is searchable</span></header>
      <form className="body form-row" onSubmit={(e) => { e.preventDefault(); setRan(q); }}>
        <div className="field"><label htmlFor="sc-text">Name or club</label><input id="sc-text" type="text" value={q.text ?? ''} onChange={(e) => set({ text: e.target.value })} /></div>
        <div className="field"><label htmlFor="sc-pos">Position</label><select id="sc-pos" value={q.pos} onChange={(e) => set({ pos: e.target.value as PlayerQuery['pos'] })}><option value="ALL">All</option><option>GK</option><option>DF</option><option>MF</option><option>FW</option></select></div>
        <div className="field"><label htmlFor="sc-ovr">Min overall</label><input id="sc-ovr" type="number" min={1} max={99} value={q.minOverall ?? 0} onChange={(e) => set({ minOverall: Number(e.target.value) })} /></div>
        <div className="field"><label htmlFor="sc-age">Max age</label><input id="sc-age" type="number" min={15} max={45} value={q.maxAge ?? 45} onChange={(e) => set({ maxAge: Number(e.target.value) })} /></div>
        <div className="field"><label htmlFor="sc-val">Max value (k)</label><input id="sc-val" type="number" min={0} step={1000} value={q.maxValue ?? ''} onChange={(e) => set({ maxValue: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="any" /></div>
        <div className="field"><label htmlFor="sc-nat">League</label><select id="sc-nat" value={q.nationId ?? ''} onChange={(e) => set({ nationId: e.target.value || undefined })}><option value="">Anywhere</option>{nations.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
        <div className="field"><label htmlFor="sc-tier">Tier</label><select id="sc-tier" value={q.tier ?? ''} onChange={(e) => set({ tier: e.target.value === '' ? undefined : Number(e.target.value) })}><option value="">Any</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></div>
        <div className="field"><label htmlFor="sc-sort">Sort</label><select id="sc-sort" value={q.sort} onChange={(e) => set({ sort: e.target.value as PlayerQuery['sort'] })}><option value="overall">Overall</option><option value="potential">Potential</option><option value="value">Value</option><option value="age">Youngest</option><option value="goals">Goals</option></select></div>
        <label className="muted"><input type="checkbox" checked={!!q.expiringOnly} onChange={(e) => set({ expiringOnly: e.target.checked })} /> Contract expiring</label>
        <label className="muted"><input type="checkbox" checked={!!q.freeAgentsOnly} onChange={(e) => set({ freeAgentsOnly: e.target.checked })} /> Free agents</label>
        <button className="btn primary" type="submit">Search</button>
      </form>
      <div className="scroll">
        <table>
          <thead><tr><th>Player</th><th>Club</th><th>League</th><th>Pos</th><th>Nat</th><th className="num">Age</th><th className="num">Ovr</th><th className="num">Pot</th><th className="num">Apps</th><th className="num">G</th><th className="num">Value</th><th className="num">Until</th></tr></thead>
          <tbody>
            {hits.map(({ player: p, club, overall, tier }) => {
              const sc = Engine.scoutReport(world, p.id);
              const c = Engine.contractOf(world, p.id);
              const lg = club ? Engine.leagueOf(world, club.id) : null;
              return (
                <tr key={p.id} onClick={() => onPlayer(p.id)} style={{ cursor: 'pointer' }} className={p.clubId === clubId ? 'mine' : ''}>
                  <td><a>{p.name}</a></td>
                  <td>{club?.name ?? <span className="muted">free agent</span>}</td>
                  <td className="muted">{lg?.name ?? (tier ? `Tier ${tier}` : '–')}</td>
                  <td>{p.position}</td>
                  <td><Flag nat={p.nationality} /></td>
                  <td className="num">{p.age}</td>
                  <td className="num"><Ovr v={overall} /></td>
                  <td className="num muted">{sc.potentialLow}–{sc.potentialHigh}</td>
                  <td className="num">{p.stats.apps}</td>
                  <td className="num">{p.stats.goals}</td>
                  <td className="num">{money(p.value, club ? Engine.currencyFor(world, club.id) : cur)}</td>
                  <td className="num">{c ? `S${c.endSeason}` : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Offers({ game, clubId, onAction, onPlayer }: { game: GameT; clubId: string; onAction: Action; onPlayer: (id: string) => void }) {
  const { world, ctx } = game;
  const cur = Engine.currencyFor(world, clubId);
  const bids = world.pendingBids;
  const listed = Engine.squad(world, clubId).filter((p) => p.listedAt !== null);
  return (
    <div className="grid-2">
      <section className="panel">
        <header><h3>Bids for your players</h3><span className="muted">{bids.length} pending</span></header>
        {bids.length === 0 ? <p className="empty">No offers on the table. Clubs bid during the window for players they rate; listing a player invites offers.</p> : (
          <ul className="offers">
            {bids.map((b) => {
              const p = world.players[b.playerId];
              const buyer = world.clubs[b.toClubId];
              return (
                <li key={b.id}>
                  <div>
                    <b>{buyer.name}</b> offer <b>{money(b.fee, cur)}</b> for <a onClick={() => onPlayer(p.id)}>{p.name}</a> ({p.position}, {Math.round(Engine.overall(p))})
                    <p className="muted">Valued at {money(p.value, cur)}{p.listedAt !== null ? ` · listed at ${money(p.listedAt, cur)}` : ''} · expires in {Math.max(0, b.expiresDay - world.day)} days · {buyer.name} are in the {Engine.leagueOf(world, buyer.id)?.name}</p>
                  </div>
                  <div className="actions">
                    <button className="btn small primary" onClick={() => onAction(Engine.respondToBid(ctx, b.id, true))}>Accept</button>
                    <button className="btn small" onClick={() => onAction(Engine.respondToBid(ctx, b.id, false))}>Reject</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="panel">
        <header><h3>Your transfer list</h3></header>
        {listed.length === 0 ? <p className="empty">Nobody is listed. Open a player from the squad to list him.</p> : (
          <ul className="news">{listed.map((p) => <li key={p.id}><a onClick={() => onPlayer(p.id)}>{p.name}</a> · {p.position} · asking {money(p.listedAt ?? 0, cur)} <button className="btn small" style={{ marginLeft: 8 }} onClick={() => onAction(Engine.unlistPlayer(ctx, p.id))}>Unlist</button></li>)}</ul>
        )}
      </section>
    </div>
  );
}

function History({ game, clubId, onPlayer }: { game: GameT; clubId: string; onPlayer: (id: string) => void }) {
  const { world } = game;
  const cur = Engine.currencyFor(world, clubId);
  const mine = world.transfers.filter((t) => (t.toClubId === clubId || t.fromClubId === clubId) && t.kind !== 'renewal').slice(-40).reverse();
  const biggest = world.transfers.filter((t) => t.season === world.season && t.kind === 'transfer').sort((a, b) => b.fee - a.fee).slice(0, 15);
  const row = (t: (typeof mine)[number]) => (
    <tr key={t.id}>
      <td className="mono muted">S{t.season} d{t.day - world.seasonStartDay}</td>
      <td><a onClick={() => onPlayer(t.playerId)}>{world.players[t.playerId]?.name ?? '?'}</a></td>
      <td>{t.fromClubId ? world.clubs[t.fromClubId]?.name : 'Free agent'}</td>
      <td>{world.clubs[t.toClubId]?.name}</td>
      <td className="num">{t.fee ? money(t.fee, Engine.currencyFor(world, t.toClubId)) : t.kind}</td>
    </tr>
  );
  return (
    <div className="grid-2">
      <section className="panel">
        <header><h3>Your deals</h3></header>
        <div className="scroll"><table><thead><tr><th>When</th><th>Player</th><th>From</th><th>To</th><th className="num">Fee</th></tr></thead><tbody>{mine.length === 0 ? <tr><td colSpan={5} className="empty">No deals yet.</td></tr> : mine.map(row)}</tbody></table></div>
      </section>
      <section className="panel">
        <header><h3>Biggest deals this season</h3><span className="muted">{money(world.transfers.filter((t) => t.season === world.season).reduce((s, t) => s + t.fee, 0), cur)} spent worldwide</span></header>
        <div className="scroll"><table><thead><tr><th>When</th><th>Player</th><th>From</th><th>To</th><th className="num">Fee</th></tr></thead><tbody>{biggest.map(row)}</tbody></table></div>
      </section>
    </div>
  );
}

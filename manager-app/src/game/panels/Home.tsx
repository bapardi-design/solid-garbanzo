'use client';
import { useMemo } from 'react';
import Engine, { type BoardStatus, type Fixture } from 'sim-engine';
import { wage, money, dayLabel, ord } from '../format';
import { Crest, FormDots, MatchReportView, oppStrength, type GameT } from './shared';

function moodPill(mood: BoardStatus['mood']) {
  const cls = mood === 'delighted' ? 'good' : mood === 'content' ? '' : mood === 'concerned' ? 'warn' : 'bad';
  return <span className={`pill ${cls}`}>{mood}</span>;
}

export function HomePanel({ game, clubId, board, nextFixture, lastFixture, onPlayer, onTab }: { game: GameT; clubId: string; board: BoardStatus | null; nextFixture?: Fixture; lastFixture: Fixture | null; onPlayer: (id: string) => void; onTab: (tab: string) => void }) {
  const { world } = game;
  const club = world.clubs[clubId];
  const cur = Engine.currencyFor(world, clubId);
  const league = Engine.leagueOf(world, clubId);
  const table = useMemo(() => (league ? Engine.computeTable(world, league) : []), [world, league, world.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const myPos = Engine.positionOf(table, clubId);
  const slice = table.slice(Math.max(0, Math.min(myPos - 3, table.length - 5)), Math.max(5, Math.min(table.length, myPos + 2)));
  const news = Engine.newsFeed(world, { clubId, limit: 8 });
  const headlines = Engine.newsFeed(world, { limit: 6 });
  const bids = world.pendingBids;
  const opp = nextFixture ? world.clubs[nextFixture.homeClubId === clubId ? nextFixture.awayClubId : nextFixture.homeClubId] : null;
  const oppLeague = opp ? Engine.leagueOf(world, opp.id) : null;
  const oppTable = oppLeague ? Engine.computeTable(world, oppLeague) : [];
  const windowOpen = Engine.inTransferWindow(world);
  return (
    <div className="grid-2">
      <div className="stack">
        {board ? (
          <div className="tiles">
            <div className="tile"><div className="v">{ord(board.target)}</div><div className="k">Board target</div><div className="sub">{board.note}</div></div>
            <div className="tile"><div className="v">{Math.round(Engine.squadStrength(world, clubId))}</div><div className="k">Squad rating</div><div className="sub">{Engine.squad(world, clubId).length} players · {Math.round(Engine.squad(world, clubId).reduce((a, p) => a + p.age, 0) / Math.max(1, Engine.squad(world, clubId).length))} avg age</div></div>
            <div className="tile"><div className="v">{money(board.transferBudget, cur)}</div><div className="k">Transfer budget</div><div className="sub">{windowOpen ? 'window open' : 'window closed'}</div></div>
            <div className="tile"><div className="v">{wage(board.wageBill, cur)}</div><div className="k">Wage bill</div><div className="sub">budget {wage(board.wageBudget, cur)}</div></div>
          </div>
        ) : null}
        <section className="panel">
          <header><h3>Next match</h3>{nextFixture ? <span className="muted">{dayLabel(nextFixture.day - world.seasonStartDay)} · {world.competitions[nextFixture.competitionId]?.name}</span> : null}</header>
          <div className="body">
            {nextFixture && opp ? (
              <div className="versus">
                <div className="team"><Crest name={world.clubs[nextFixture.homeClubId].name} short={world.clubs[nextFixture.homeClubId].short} size="l" /><b>{world.clubs[nextFixture.homeClubId].name}</b></div>
                <div className="v">v</div>
                <div className="team"><Crest name={world.clubs[nextFixture.awayClubId].name} short={world.clubs[nextFixture.awayClubId].short} size="l" /><b>{world.clubs[nextFixture.awayClubId].name}</b></div>
                <p className="muted span">{opp.name} are {oppStrength(game, clubId, opp.id)}{oppLeague ? `, ${ord(Engine.positionOf(oppTable, opp.id))} in the ${oppLeague.name}` : ''}. Form <FormDots form={opp.form} />. Manager {opp.managerId ? world.managers[opp.managerId].name : 'vacant'}.</p>
              </div>
            ) : <p className="muted">No more fixtures this season.</p>}
          </div>
        </section>
        {lastFixture ? (
          <section className="panel">
            <header><h3>Last result</h3><button className="btn small" onClick={() => onTab('fixtures')}>All results</button></header>
            <div className="body"><MatchReportView game={game} fixture={lastFixture} open onPlayer={onPlayer} /></div>
          </section>
        ) : null}
        {league ? (
          <section className="panel">
            <header><h3>{league.name}</h3><button className="btn small" onClick={() => onTab('competitions')}>Full table</button></header>
            <div className="scroll">
              <table>
                <thead><tr><th className="num">#</th><th>Club</th><th className="num">P</th><th className="num">GD</th><th className="num">Pts</th></tr></thead>
                <tbody>{slice.map((r) => <tr key={r.clubId} className={r.clubId === clubId ? 'mine' : ''}><td className="num">{r.position}</td><td className="club-cell"><Crest name={world.clubs[r.clubId].name} short={world.clubs[r.clubId].short} size="xs" />{world.clubs[r.clubId].name}</td><td className="num">{r.played}</td><td className="num">{r.gd > 0 ? '+' : ''}{r.gd}</td><td className="num pts">{r.points}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
      <div className="stack">
        {bids.length ? (
          <section className="panel highlight">
            <header><h3>Offers waiting</h3><button className="btn small primary" onClick={() => onTab('transfers')}>Respond</button></header>
            <ul className="news">{bids.map((b) => <li key={b.id}><b>{world.clubs[b.toClubId].name}</b> offer {money(b.fee, cur)} for {world.players[b.playerId].name}. Expires in {Math.max(0, b.expiresDay - world.day)} days.</li>)}</ul>
          </section>
        ) : null}
        <section className="panel">
          <header><h3>Club news</h3><button className="btn small" onClick={() => onTab('news')}>All news</button></header>
          <ul className="news">
            {news.length === 0 ? <li className="empty">Transfers, injuries, board messages and match reports land here.</li> : news.map((n) => <li key={n.id}><span className="d">d{n.day - world.seasonStartDay}</span><span className={`cat ${n.category}`}>{n.category}</span>{n.headline}</li>)}
          </ul>
        </section>
        <section className="panel">
          <header><h3>Around the world</h3></header>
          <ul className="news">{headlines.map((n) => <li key={n.id}><span className="d">d{n.day - world.seasonStartDay}</span><span className={`cat ${n.category}`}>{n.category}</span>{n.headline}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}

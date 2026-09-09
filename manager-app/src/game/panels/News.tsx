'use client';
import { useState } from 'react';
import Engine, { type NewsCategory } from 'sim-engine';
import type { GameT } from './shared';

const CATS: { id: NewsCategory | 'all' | 'mine'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'mine', label: 'My club' }, { id: 'transfer', label: 'Transfers' }, { id: 'rumour', label: 'Rumours' }, { id: 'bid', label: 'Bids' },
  { id: 'match', label: 'Results' }, { id: 'cup', label: 'Cups' }, { id: 'manager', label: 'Managers' }, { id: 'injury', label: 'Injuries' }, { id: 'board', label: 'Board' }, { id: 'award', label: 'Awards' },
];

export function NewsPanel({ game, clubId, onPlayer }: { game: GameT; clubId: string; onPlayer: (id: string) => void }) {
  const { world } = game;
  const [cat, setCat] = useState<(typeof CATS)[number]['id']>('all');
  const [nation, setNation] = useState<string>('');
  const [open, setOpen] = useState<string | null>(null);
  const items = Engine.newsFeed(world, { clubId: cat === 'mine' ? clubId : undefined, category: cat === 'mine' || cat === 'all' ? 'all' : cat, nationId: nation || null, limit: 120 });
  const nations = Object.values(world.nations);
  return (
    <section className="panel">
      <header>
        <h3>News</h3>
        <div className="actions">
          <select value={nation} onChange={(e) => setNation(e.target.value)} aria-label="Nation"><option value="">Everywhere</option>{nations.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select>
        </div>
      </header>
      <div className="chips">{CATS.map((c) => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.label}</button>)}</div>
      <ul className="feed">
        {items.length === 0 ? <li className="empty">Nothing yet. Play a few days.</li> : items.map((n) => (
          <li key={n.id} className={open === n.id ? 'open' : ''}>
            <div className="head" onClick={() => setOpen(open === n.id ? null : n.id)}>
              <span className="d">S{n.season} · d{n.day - world.seasonStartDay}</span>
              <span className={`cat ${n.category}`}>{n.category}</span>
              <b>{n.headline}</b>
            </div>
            {open === n.id ? (
              <div className="bodytext">
                {n.body.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                <p className="muted">
                  {n.clubIds.map((id) => world.clubs[id]?.name).filter(Boolean).join(' · ')}
                  {n.playerId ? <> · <a onClick={() => onPlayer(n.playerId!)}>{world.players[n.playerId]?.name}</a></> : null}
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

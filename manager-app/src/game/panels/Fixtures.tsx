'use client';
import { useState } from 'react';
import Engine, { type Fixture } from 'sim-engine';
import { dayLabel } from '../format';
import { Crest, MatchReportView, type GameT } from './shared';

export function FixturesPanel({ game, clubId, fixtures, onPlayer }: { game: GameT; clubId: string; fixtures: Fixture[]; onPlayer: (id: string) => void }) {
  const { world } = game;
  const [open, setOpen] = useState<string | null>(null);
  const opened = open ? world.fixtures[open] : null;
  const played = fixtures.filter((f) => f.played);
  const w = played.filter((f) => f.winnerId === clubId).length, d = played.filter((f) => f.winnerId === null).length, l = played.length - w - d;
  const comps = new Map<string, number>();
  for (const f of fixtures) comps.set(f.competitionId, (comps.get(f.competitionId) ?? 0) + 1);
  return (
    <div className="grid-2">
      <section className="panel">
        <header><h3>Fixtures and results</h3><span className="muted">season {world.season} · W{w} D{d} L{l} · {[...comps.keys()].map((id) => world.competitions[id]?.name).join(', ')}</span></header>
        <ul className="rows">
          {fixtures.map((f) => {
            const home = f.homeClubId === clubId;
            const res = f.played ? (f.winnerId === clubId ? 'W' : f.winnerId === null ? 'D' : 'L') : '';
            const comp = world.competitions[f.competitionId];
            const label = comp?.kind === 'cup' ? (f.group !== null ? `group ${String.fromCharCode(65 + f.group)}` : Engine.roundLabel(f.round, comp.totalRounds)) : `round ${f.round}`;
            return (
              <li key={f.id} aria-selected={open === f.id} onClick={() => f.played && setOpen(f.id)} style={{ cursor: f.played ? 'pointer' : 'default' }} className={res ? `res-${res}` : ''}>
                <span className="h"><Crest name={world.clubs[f.homeClubId].name} short={world.clubs[f.homeClubId].short} size="xs" />{world.clubs[f.homeClubId].name}</span>
                <span className="s">{f.played ? `${f.homeGoals}–${f.awayGoals}` : 'v'}</span>
                <span><Crest name={world.clubs[f.awayClubId].name} short={world.clubs[f.awayClubId].short} size="xs" />{world.clubs[f.awayClubId].name}</span>
                <span className="meta">{dayLabel(f.day - world.seasonStartDay)} · {comp?.name} {label} · {home ? 'home' : 'away'}{res ? ` · ${res}` : ''}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="panel">
        <header><h3>Match report</h3></header>
        <div className="body">{opened ? <MatchReportView game={game} fixture={opened} open onPlayer={onPlayer} /> : <p className="muted">Pick a played match.</p>}</div>
      </section>
    </div>
  );
}

'use client';
/**
 * Minute-by-minute replay of a played fixture. The engine has already decided
 * the result; this view reveals it as a live match with commentary built from
 * the report (goals, assists, expected goals, penalties).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Engine, { type Fixture } from 'sim-engine';
import { Crest, type GameT } from './shared';

interface Line { minute: number; kind: 'goal' | 'chance' | 'info' | 'card' | 'half' | 'end'; clubId: string | null; text: string }

function seeded(s: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const CHANCE = ['{p} shoots from distance; over the bar.', '{p} gets in behind but the keeper stands tall.', 'Corner for {c}; {p} heads it wide.', '{p} cuts inside and curls one just past the post.', 'Big chance! {p} scuffs it from eight yards.', '{c} pressing high; {p} wins it back and drives forward.', 'Cross from {p} cleared at the near post.', 'Save! {p} forces a full-stretch stop.'];
const GOALS = ['GOAL! {p} finishes clinically. {s}', 'GOAL! {p} scores for {c}. {s}', 'GOAL! {p} with a composed finish. {s}', 'GOAL! A rocket from {p}. {s}'];
const FILLER = ['Midfield battle; neither side finding a way through.', 'A lull in the game. Both benches restless.', 'Yellow card; a late challenge in midfield.', '{c} dominating possession without a clear opening.', 'The crowd finds its voice.'];

export function buildCommentary(game: GameT, f: Fixture): Line[] {
  const w = game.world;
  const r = f.report!;
  const rnd = seeded(f.id);
  const home = w.clubs[f.homeClubId], away = w.clubs[f.awayClubId];
  const lines: Line[] = [{ minute: 0, kind: 'info', clubId: null, text: `Kick-off at ${home.name}. ${home.short} line up ${r.homeFormation}, ${away.short} ${r.awayFormation}. Attendance ${r.attendance.toLocaleString('en-GB')}.` }];
  const pick = (arr: string[]) => arr[Math.floor(rnd() * arr.length)];
  const name = (id: string) => w.players[id]?.name ?? 'a player';
  const xiOf = (clubId: string) => (clubId === home.id ? r.homeXI : r.awayXI);
  const outfield = (clubId: string) => xiOf(clubId).slice(1);
  let hs = 0, as = 0;
  const events: { minute: number; clubId: string; goal?: (typeof r.goals)[number] }[] = r.goals.map((g) => ({ minute: g.minute, clubId: g.clubId, goal: g }));
  const chances = Math.round((r.lambda.home + r.lambda.away) * 3);
  for (let i = 0; i < chances; i++) {
    const clubId = rnd() < r.lambda.home / (r.lambda.home + r.lambda.away) ? home.id : away.id;
    events.push({ minute: 1 + Math.floor(rnd() * 90), clubId });
  }
  for (let i = 0; i < 4; i++) events.push({ minute: 1 + Math.floor(rnd() * 90), clubId: rnd() < 0.5 ? home.id : away.id });
  events.sort((a, b) => a.minute - b.minute);
  let half = false;
  for (const e of events) {
    if (!half && e.minute > 45) { half = true; lines.push({ minute: 45, kind: 'half', clubId: null, text: `Half-time: ${home.short} ${hs}-${as} ${away.short}.` }); }
    const c = w.clubs[e.clubId];
    if (e.goal) {
      if (e.clubId === home.id) hs++; else as++;
      const s = `${home.short} ${hs}-${as} ${away.short}.`;
      const assist = e.goal.assistId ? ` Assist ${name(e.goal.assistId)}.` : '';
      lines.push({ minute: e.minute, kind: 'goal', clubId: e.clubId, text: pick(GOALS).replace('{p}', name(e.goal.scorerId)).replace('{c}', c.name).replace('{s}', s) + assist });
    } else {
      const p = name(outfield(e.clubId)[Math.floor(rnd() * outfield(e.clubId).length)]);
      const t = rnd() < 0.7 ? pick(CHANCE) : pick(FILLER);
      lines.push({ minute: e.minute, kind: t.includes('card') ? 'card' : 'chance', clubId: e.clubId, text: t.replace('{p}', p).replace('{c}', c.short) });
    }
  }
  if (!half) lines.push({ minute: 45, kind: 'half', clubId: null, text: `Half-time: ${home.short} ${hs}-${as} ${away.short}.` });
  if (r.penalties) lines.push({ minute: 90, kind: 'info', clubId: null, text: `Full-time ${hs}-${as}. Penalties: ${home.short} ${r.penalties.home}-${r.penalties.away} ${away.short}. ${w.clubs[f.winnerId!].name} go through.` });
  lines.push({ minute: 90, kind: 'end', clubId: null, text: `Full-time: ${home.name} ${f.homeGoals}-${f.awayGoals} ${away.name}.` });
  return lines;
}

export function MatchLive({ game, fixture, clubId, onDone }: { game: GameT; fixture: Fixture; clubId: string; onDone: () => void }) {
  const w = game.world;
  const home = w.clubs[fixture.homeClubId], away = w.clubs[fixture.awayClubId];
  const lines = useMemo(() => buildCommentary(game, fixture), [game, fixture]);
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [done, setDone] = useState(false);
  const feed = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setMinute((m) => { if (m >= 90) { setDone(true); return 90; } return m + 1; }), 220 / speed);
    return () => clearInterval(id);
  }, [speed, done]);
  const shown = lines.filter((l) => l.minute <= minute);
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [shown.length]);
  const hs = shown.filter((l) => l.kind === 'goal' && l.clubId === home.id).length;
  const as = shown.filter((l) => l.kind === 'goal' && l.clubId === away.id).length;
  const mine = fixture.homeClubId === clubId ? home : away;
  return (
    <div className="modal-backdrop live" role="dialog" aria-modal="true" aria-label="Live match">
      <div className="modal wide">
        <p className="eyebrow">{w.competitions[fixture.competitionId]?.name} · live</p>
        <div className="scoreboard">
          <div className="team"><Crest short={home.short} size="l" /><b>{home.name}</b></div>
          <div className="mid"><div className="sc">{done ? fixture.homeGoals : hs}<span>–</span>{done ? fixture.awayGoals : as}</div><div className="clock">{done ? 'FT' : `${minute}'`}</div></div>
          <div className="team"><Crest short={away.short} size="l" /><b>{away.name}</b></div>
        </div>
        <ul className="commentary" ref={feed}>
          {shown.map((l, i) => <li key={i} className={`${l.kind} ${l.clubId === mine.id ? 'mine' : ''}`}><span className="min">{l.minute}&apos;</span>{l.text}</li>)}
        </ul>
        <div className="actions">
          {!done ? <>
            <button className={`btn small ${speed === 1 ? 'primary' : ''}`} onClick={() => setSpeed(1)}>1x</button>
            <button className={`btn small ${speed === 3 ? 'primary' : ''}`} onClick={() => setSpeed(3)}>3x</button>
            <button className="btn small" onClick={() => { setMinute(90); setDone(true); }}>Skip to full-time</button>
          </> : <button className="btn primary" onClick={onDone}>Continue</button>}
        </div>
      </div>
    </div>
  );
}

'use client';
/**
 * Minute-by-minute match view. Two modes:
 *  - replay: the engine has already decided the match; this reveals it live.
 *  - managed: the engine paused at half time, so the first half is replayed,
 *    the half-time panel takes tactics and substitutions, and the second half
 *    is played out once the decision is made.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Engine, { type CardEvent, type Fixture, type HalfTimeDecision, type World } from 'sim-engine';
import { Crest, Ovr, type GameT } from './shared';
import { identity, luminance } from '../brand';

/** The colour bar under a club: white kits show their trim instead. */
const kitBar = (name: string): string => {
  const id = identity(name);
  return luminance(id.primary) > 0.75 ? id.secondary : id.primary;
};

interface Line { minute: number; kind: 'goal' | 'chance' | 'info' | 'card' | 'red' | 'half' | 'sub' | 'end'; clubId: string | null; text: string }

function seeded(s: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const CHANCE = ['{p} shoots from distance; over the bar.', '{p} gets in behind but the keeper stands tall.', 'Corner for {c}; {p} heads it wide.', '{p} cuts inside and curls one just past the post.', 'Big chance! {p} scuffs it from eight yards.', '{c} pressing high; {p} wins it back and drives forward.', 'Cross from {p} cleared at the near post.', 'Save! {p} forces a full-stretch stop.'];
const GOALS = ['GOAL! {p} finishes clinically. {s}', 'GOAL! {p} scores for {c}. {s}', 'GOAL! {p} with a composed finish. {s}', 'GOAL! A rocket from {p}. {s}'];
const FILLER = ['Midfield battle; neither side finding a way through.', 'A lull in the game. Both benches restless.', 'A free kick out wide comes to nothing.', '{c} dominating possession without a clear opening.', 'The crowd finds its voice.'];
const YELLOWS = ['Booked. {p} goes into the book for a late one.', 'Yellow card for {p}; he drags {c} back as they broke.', '{p} is shown a yellow after a word with the referee.', 'Cynical from {p}, and the card comes out.'];
const SECONDS = ['Second yellow! {p} is off, and {c} are down to ten.', 'That is two for {p}. Off he goes; {c} play the rest a man short.'];
const REDS = ['RED CARD. {p} is sent off — {c} have a mountain to climb with ten.', 'Straight red for {p}. No argument; {c} are down to ten men.'];

interface HalfSpec {
  seed: string;
  homeId: string;
  awayId: string;
  homeXI: string[];
  awayXI: string[];
  goals: { minute: number; clubId: string; scorerId: string; assistId: string | null }[];
  lambdaHome: number;
  lambdaAway: number;
  from: number;
  to: number;
  score: { home: number; away: number };
  cards: CardEvent[];
}

/** Commentary for one half. `score` is the running score at kick-off of the half. */
function halfLines(w: World, spec: HalfSpec): Line[] {
  const rnd = seeded(spec.seed);
  const home = w.clubs[spec.homeId], away = w.clubs[spec.awayId];
  let last = '';
  const pick = (arr: string[]) => {
    let t = arr[Math.floor(rnd() * arr.length)];
    if (t === last) t = arr[Math.floor(rnd() * arr.length)];
    last = t;
    return t;
  };
  const name = (id: string) => w.players[id]?.name ?? 'a player';
  const outfield = (clubId: string) => (clubId === home.id ? spec.homeXI : spec.awayXI).slice(1);
  let hs = spec.score.home, as = spec.score.away;
  const span = spec.to - spec.from + 1;
  const events: { minute: number; clubId: string; goal?: HalfSpec['goals'][number]; card?: CardEvent }[] = [
    ...spec.goals.map((g) => ({ minute: g.minute, clubId: g.clubId, goal: g })),
    ...spec.cards.filter((c) => c.minute >= spec.from && c.minute <= spec.to).map((c) => ({ minute: c.minute, clubId: c.clubId, card: c })),
  ];
  const chances = Math.max(1, Math.round((spec.lambdaHome + spec.lambdaAway) * 3));
  for (let i = 0; i < chances; i++) {
    const clubId = rnd() < spec.lambdaHome / Math.max(0.01, spec.lambdaHome + spec.lambdaAway) ? home.id : away.id;
    events.push({ minute: spec.from + Math.floor(rnd() * span), clubId });
  }
  for (let i = 0; i < 2; i++) events.push({ minute: spec.from + Math.floor(rnd() * span), clubId: rnd() < 0.5 ? home.id : away.id });
  events.sort((a, b) => a.minute - b.minute);
  const lines: Line[] = [];
  for (const e of events) {
    const c = w.clubs[e.clubId];
    if (e.goal) {
      if (e.clubId === home.id) hs++; else as++;
      const assist = e.goal.assistId ? ` Assist ${name(e.goal.assistId)}.` : '';
      lines.push({ minute: e.minute, kind: 'goal', clubId: e.clubId, text: pick(GOALS).replace('{p}', name(e.goal.scorerId)).replace('{c}', c.name).replace('{s}', `${home.short} ${hs}-${as} ${away.short}.`) + assist });
    } else if (e.card) {
      const pool = e.card.kind === 'yellow' ? YELLOWS : e.card.kind === 'second' ? SECONDS : REDS;
      lines.push({ minute: e.minute, kind: e.card.kind === 'yellow' ? 'card' : 'red', clubId: e.clubId, text: pick(pool).replace('{p}', name(e.card.playerId)).replace('{c}', c.short) });
    } else {
      const pool = outfield(e.clubId);
      const p = name(pool[Math.floor(rnd() * pool.length)]);
      const t = rnd() < 0.7 ? pick(CHANCE) : pick(FILLER);
      lines.push({ minute: e.minute, kind: 'chance', clubId: e.clubId, text: t.replace('{p}', p).replace('{c}', c.short) });
    }
  }
  return lines;
}

function kickOff(w: World, f: { homeClubId: string; awayClubId: string }, homeFormation: string, awayFormation: string, attendance: number): Line {
  const home = w.clubs[f.homeClubId], away = w.clubs[f.awayClubId];
  return { minute: 0, kind: 'info', clubId: null, text: `Kick-off at ${home.name}. ${home.short} line up ${homeFormation}, ${away.short} ${awayFormation}. Attendance ${attendance.toLocaleString('en-GB')}.` };
}

/** Second-half XI of a club: the starters, with half-time swaps applied. */
function secondHalfXI(f: Fixture, clubId: string): string[] {
  const r = f.report!;
  const xi = [...(clubId === f.homeClubId ? r.homeXI : r.awayXI)];
  for (const s of r.subs) {
    if (s.clubId !== clubId) continue;
    const i = xi.indexOf(s.offId);
    if (i >= 0) xi[i] = s.onId;
  }
  return xi;
}

/** Full commentary of a finished match, both halves. */
export function buildCommentary(game: GameT, f: Fixture): Line[] {
  const w = game.world;
  const r = f.report!;
  const home = w.clubs[f.homeClubId], away = w.clubs[f.awayClubId];
  const first = halfLines(w, {
    seed: f.id, homeId: home.id, awayId: away.id, homeXI: r.homeXI, awayXI: r.awayXI,
    goals: r.goals.filter((g) => g.minute <= 45), cards: r.cards, lambdaHome: r.lambda.home / 2, lambdaAway: r.lambda.away / 2,
    from: 1, to: 45, score: { home: 0, away: 0 },
  });
  const second = halfLines(w, {
    seed: `${f.id}#2`, homeId: home.id, awayId: away.id, homeXI: secondHalfXI(f, home.id), awayXI: secondHalfXI(f, away.id),
    goals: r.goals.filter((g) => g.minute > 45), cards: r.cards, lambdaHome: (r.second?.lambda.home ?? r.lambda.home) / 2, lambdaAway: (r.second?.lambda.away ?? r.lambda.away) / 2,
    from: 46, to: 90, score: r.halfTimeScore,
  });
  return [
    kickOff(w, f, r.homeFormation, r.awayFormation, r.attendance),
    ...first,
    { minute: 45, kind: 'half', clubId: null, text: `Half-time: ${home.short} ${r.halfTimeScore.home}-${r.halfTimeScore.away} ${away.short}.` },
    ...halfTimeChangeLines(w, f),
    ...second,
    ...(r.penalties ? [{ minute: 90, kind: 'info' as const, clubId: null, text: `Full-time ${f.homeGoals}-${f.awayGoals}. Penalties: ${home.short} ${r.penalties.home}-${r.penalties.away} ${away.short}. ${w.clubs[f.winnerId!].name} go through.` }] : []),
    { minute: 90, kind: 'end', clubId: null, text: `Full-time: ${home.name} ${f.homeGoals}-${f.awayGoals} ${away.name}.` },
  ];
}

function halfTimeChangeLines(w: World, f: Fixture): Line[] {
  const r = f.report!;
  const out: Line[] = [];
  if (r.tacticChange) out.push({ minute: 46, kind: 'info', clubId: r.tacticChange.clubId, text: `${w.clubs[r.tacticChange.clubId].short} switch to ${r.tacticChange.to} for the second half.` });
  for (const s of r.subs) out.push({ minute: 46, kind: 'sub', clubId: s.clubId, text: `${w.clubs[s.clubId].short} substitution: ${w.players[s.onId]?.name ?? s.onId} on for ${w.players[s.offId]?.name ?? s.offId}.` });
  return out;
}

function Scoreboard({ game, f, homeGoals, awayGoals, clock, note, derby }: { game: GameT; f: { homeClubId: string; awayClubId: string; competitionId?: string }; homeGoals: number; awayGoals: number; clock: string; note?: string; derby?: boolean }) {
  const w = game.world;
  const home = w.clubs[f.homeClubId], away = w.clubs[f.awayClubId];
  return (
    <>
      <p className="eyebrow">{f.competitionId ? w.competitions[f.competitionId]?.name : note} · live{derby ? <> · <span className="pill hot">derby</span></> : null}</p>
      <div className="scoreboard">
        <div className="team"><Crest name={home.name} short={home.short} size="l" /><b>{home.name}</b><i className="kit" style={{ background: kitBar(home.name) }} /></div>
        <div className="mid"><div className="sc">{homeGoals}<span>–</span>{awayGoals}</div><div className="clock">{clock}</div></div>
        <div className="team"><Crest name={away.name} short={away.short} size="l" /><b>{away.name}</b><i className="kit" style={{ background: kitBar(away.name) }} /></div>
      </div>
    </>
  );
}

function Feed({ lines, mineId }: { lines: Line[]; mineId: string }) {
  const feed = useRef<HTMLUListElement>(null);
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [lines.length]);
  return (
    <ul className="commentary" ref={feed}>
      {lines.map((l, i) => <li key={i} className={`ev-${l.kind}${l.clubId === mineId ? ' mine' : ''}`}><span className="min">{l.minute}&apos;</span>{l.text}</li>)}
    </ul>
  );
}

/** Ticks a clock from `from` to `to`, pausing when `paused`. */
function useClock(from: number, to: number, speed: number, running: boolean): [number, () => void] {
  const [minute, setMinute] = useState(from);
  useEffect(() => { setMinute(from); }, [from]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setMinute((m) => (m >= to ? to : m + 1)), 220 / speed);
    return () => clearInterval(id);
  }, [speed, running, to]);
  return [minute, () => setMinute(to)];
}

export function MatchLive({ game, fixture, clubId, onDone }: { game: GameT; fixture: Fixture; clubId: string; onDone: () => void }) {
  const lines = useMemo(() => buildCommentary(game, fixture), [game, fixture]);
  const [speed, setSpeed] = useState(1);
  const [minute, skip] = useClock(0, 90, speed, true);
  const done = minute >= 90;
  const shown = lines.filter((l) => l.minute <= minute);
  const hs = done ? fixture.homeGoals : shown.filter((l) => l.kind === 'goal' && l.clubId === fixture.homeClubId).length;
  const as = done ? fixture.awayGoals : shown.filter((l) => l.kind === 'goal' && l.clubId === fixture.awayClubId).length;
  return (
    <div className="modal-backdrop live" role="dialog" aria-modal="true" aria-label="Live match">
      <div className="modal wide">
        <Scoreboard game={game} f={fixture} homeGoals={hs} awayGoals={as} clock={done ? 'FT' : `${minute}'`} derby={fixture.report?.derby} />
        <Feed lines={shown} mineId={clubId} />
        <div className="actions">
          {!done ? <>
            <button className={`btn small ${speed === 1 ? 'primary' : ''}`} onClick={() => setSpeed(1)}>1x</button>
            <button className={`btn small ${speed === 3 ? 'primary' : ''}`} onClick={() => setSpeed(3)}>3x</button>
            <button className="btn small" onClick={skip}>Skip to full-time</button>
          </> : <button className="btn primary" onClick={onDone}>Continue</button>}
        </div>
      </div>
    </div>
  );
}

type View = NonNullable<ReturnType<typeof Engine.halfTimeView>>;
type Paused = NonNullable<World['halfTime']>;

/**
 * A match of yours played in two halves: you pick the tactic and the
 * substitutions at half time, and the engine plays the rest out.
 */
export function ManagedMatch({ game, clubId, onResume, onDone }: { game: GameT; clubId: string; onResume: (d: HalfTimeDecision) => Fixture; onDone: () => void }) {
  const w = game.world;
  // The paused state is captured once: resuming clears it from the world.
  const snap = useRef<{ view: View; ht: Paused } | null>(null);
  if (!snap.current && w.halfTime) snap.current = { view: Engine.halfTimeView(w) as View, ht: w.halfTime };
  const start = snap.current?.view ?? null;
  const ht = snap.current?.ht ?? null;
  const [phase, setPhase] = useState<'first' | 'ht' | 'second'>('first');
  const [speed, setSpeed] = useState(1);
  const [tactic, setTactic] = useState<View['mine']['tactic']>(start?.mine.tactic ?? 'balanced');
  const [subs, setSubs] = useState<{ offId: string; onId: string }[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [minute, skip] = useClock(phase === 'second' ? 45 : 0, phase === 'second' ? 90 : 45, speed, phase !== 'ht');

  useEffect(() => { if (phase === 'first' && minute >= 45) setPhase('ht'); }, [minute, phase]);

  const firstLines = useMemo(() => {
    if (!start || !ht) return [] as Line[];
    return [
      kickOff(w, { homeClubId: start.homeClubId, awayClubId: start.awayClubId }, ht.homeFormation, ht.awayFormation, ht.attendance),
      ...halfLines(w, {
        seed: start.fixtureId, homeId: start.homeClubId, awayId: start.awayClubId,
        homeXI: ht.homeXI, awayXI: ht.awayXI,
        goals: start.goals, cards: start.cards, lambdaHome: start.xg.home, lambdaAway: start.xg.away, from: 1, to: 45, score: { home: 0, away: 0 },
      }),
    ];
  }, [start, ht, w]);

  const secondLines = useMemo(() => {
    if (!fixture) return [] as Line[];
    const r = fixture.report!;
    return [
      ...halfTimeChangeLines(w, fixture),
      ...halfLines(w, {
        seed: `${fixture.id}#2`, homeId: fixture.homeClubId, awayId: fixture.awayClubId,
        homeXI: secondHalfXI(fixture, fixture.homeClubId), awayXI: secondHalfXI(fixture, fixture.awayClubId),
        goals: r.goals.filter((g) => g.minute > 45), cards: r.cards, lambdaHome: (r.second?.lambda.home ?? r.lambda.home) / 2, lambdaAway: (r.second?.lambda.away ?? r.lambda.away) / 2,
        from: 46, to: 90, score: r.halfTimeScore,
      }),
      ...(r.penalties ? [{ minute: 90, kind: 'info' as const, clubId: null, text: `Penalties: ${w.clubs[fixture.homeClubId].short} ${r.penalties.home}-${r.penalties.away} ${w.clubs[fixture.awayClubId].short}.` }] : []),
      { minute: 90, kind: 'end' as const, clubId: null, text: `Full-time: ${w.clubs[fixture.homeClubId].name} ${fixture.homeGoals}-${fixture.awayGoals} ${w.clubs[fixture.awayClubId].name}.` },
    ];
  }, [fixture, w]);

  if (!start) return null;
  const mineHome = start.mine.home;
  const lines = phase === 'second' ? [...firstLines, { minute: 45, kind: 'half' as const, clubId: null, text: `Half-time: ${w.clubs[start.homeClubId].short} ${start.homeGoals}-${start.awayGoals} ${w.clubs[start.awayClubId].short}.` }, ...secondLines] : firstLines;
  const shown = lines.filter((l) => l.minute <= minute);
  const done = phase === 'second' && minute >= 90;
  const hs = phase === 'second' ? (done ? fixture!.homeGoals : shown.filter((l) => l.kind === 'goal' && l.clubId === start.homeClubId).length) : shown.filter((l) => l.kind === 'goal' && l.clubId === start.homeClubId).length;
  const as = phase === 'second' ? (done ? fixture!.awayGoals : shown.filter((l) => l.kind === 'goal' && l.clubId === start.awayClubId).length) : shown.filter((l) => l.kind === 'goal' && l.clubId === start.awayClubId).length;

  const offIds = subs.map((s) => s.offId), onIds = subs.map((s) => s.onId);
  const bench = start.mine.bench.filter((id) => !onIds.includes(id));
  const play = () => {
    const f = onResume({ tactic, subs });
    setFixture(f);
    setPhase('second');
  };
  const myBooked = start.cards.filter((c) => c.clubId === clubId && c.kind === 'yellow' && !start.mine.sentOff.includes(c.playerId)).map((c) => c.playerId);
  const myGoals = mineHome ? start.homeGoals : start.awayGoals;
  const theirGoals = mineHome ? start.awayGoals : start.homeGoals;
  const mood = myGoals > theirGoals ? 'You are ahead. Keep the shape or push on?' : myGoals < theirGoals ? 'You are behind. Something has to change.' : 'All square. The game is there to be won.';

  return (
    <div className="modal-backdrop live" role="dialog" aria-modal="true" aria-label="Live match">
      <div className="modal wide">
        <Scoreboard game={game} f={{ homeClubId: start.homeClubId, awayClubId: start.awayClubId }} homeGoals={hs} awayGoals={as} clock={done ? 'FT' : phase === 'ht' ? 'HT' : `${minute}'`} note={start.competitionName} derby={start.derby} />
        {phase === 'ht' ? (
          <div className="halftime">
            <p className="lede">{mood} First-half expected goals: you {(mineHome ? start.xg.home : start.xg.away).toFixed(2)}, them {(mineHome ? start.xg.away : start.xg.home).toFixed(2)}.</p>
            {start.mine.sentOff.length ? <p className="warn-note">{start.mine.sentOff.map((id) => w.players[id]?.name ?? id).join(' and ')} sent off. You play the second half with {11 - start.mine.sentOff.length} men.</p> : null}
            {myBooked.length ? <p className="booked-note"><i className="card-y" />{myBooked.map((id) => w.players[id]?.name ?? id).join(', ')} {myBooked.length === 1 ? 'is' : 'are'} walking a tightrope. One more and {myBooked.length === 1 ? 'he is' : 'they are'} off.</p> : null}
            <div className="ht-cols">
              <div>
                <h4>Approach</h4>
                <div className="chips">
                  {(['defensive', 'balanced', 'attacking'] as const).map((t) => (
                    <button key={t} type="button" className={tactic === t ? 'on' : ''} onClick={() => setTactic(t)}>{t}{t === start.mine.tactic ? ' (now)' : ''}</button>
                  ))}
                </div>
                <p className="muted small">Attacking lifts your chances and theirs; defensive does the opposite. The shape stays {start.mine.formation}.</p>
                <h4>On the pitch</h4>
                <ul className="xi-list">
                  {start.mine.xi.map(({ playerId, pos }) => {
                    const p = w.players[playerId];
                    const swapped = subs.find((s) => s.offId === playerId);
                    return (
                      <li key={playerId} className={swapped ? 'out' : ''}>
                        <span className="pos">{pos}</span>
                        <span className="nm">{p.name}{myBooked.includes(playerId) ? <i className="card-y" title="Booked" /> : null}</span>
                        <Ovr v={Engine.overall(p)} />
                        <span className="muted small">{Math.round(p.fitness)}% fit</span>
                        {swapped
                          ? <button className="btn small" onClick={() => setSubs(subs.filter((s) => s.offId !== playerId))}>undo</button>
                          : <button className="btn small" disabled={subs.length >= start.maxSubs} onClick={() => setPicking(picking === playerId ? null : playerId)}>{picking === playerId ? 'cancel' : 'sub'}</button>}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <h4>Bench{picking ? ` — on for ${w.players[picking].name}` : ''}</h4>
                <p className="muted small">{picking ? `Choose who comes on for ${w.players[picking].name}.` : `Press SUB next to a player to take him off. ${start.maxSubs - subs.length} substitution${start.maxSubs - subs.length === 1 ? '' : 's'} left.`}</p>
                <ul className="xi-list">
                  {bench.slice(0, 12).map((id) => {
                    const p = w.players[id];
                    return (
                      <li key={id}>
                        <span className="pos">{p.position}</span>
                        <span className="nm">{p.name}</span>
                        <Ovr v={Engine.overall(p)} />
                        <span className="muted small">{Math.round(p.fitness)}% fit</span>
                        <button className="btn small primary" disabled={!picking} onClick={() => { setSubs([...subs, { offId: picking as string, onId: id }]); setPicking(null); }}>bring on</button>
                      </li>
                    );
                  })}
                </ul>
                {subs.length ? (
                  <>
                    <h4>Changes</h4>
                    <ul className="xi-list">
                      {subs.map((s) => <li key={s.offId}><span className="pos">↑</span><span className="nm">{w.players[s.onId].name}</span><span className="muted small">for {w.players[s.offId].name}</span></li>)}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={play}>Play the second half</button>
              <button className="btn" onClick={() => { setSubs([]); setTactic(start.mine.tactic); setTimeout(play, 0); }}>No changes</button>
            </div>
          </div>
        ) : (
          <>
            <Feed lines={shown} mineId={clubId} />
            <div className="actions">
              {!done ? <>
                <button className={`btn small ${speed === 1 ? 'primary' : ''}`} onClick={() => setSpeed(1)}>1x</button>
                <button className={`btn small ${speed === 3 ? 'primary' : ''}`} onClick={() => setSpeed(3)}>3x</button>
                <button className="btn small" onClick={skip}>{phase === 'first' ? 'Skip to half-time' : 'Skip to full-time'}</button>
              </> : <button className="btn primary" onClick={onDone}>Continue</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

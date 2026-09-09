'use client';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import Engine, { type Event, type Fixture } from 'sim-engine';
import { LIMITS } from '@/lib/entitlements';
import { useSession } from './session';
import { cloud, local, StoreError, type CareerRecord } from './store';
import { summarise } from './summary';
import { dayLabel } from './format';
import { UpgradeButton } from '@/components/UpgradeButton';
import { HomePanel } from './panels/Home';
import { NewsPanel } from './panels/News';
import { SquadPanel } from './panels/Squad';
import { TransfersPanel } from './panels/Transfers';
import { TacticsPanel } from './panels/Tactics';
import { FixturesPanel } from './panels/Fixtures';
import { CompetitionsPanel } from './panels/Competitions';
import { FinancesPanel } from './panels/Finances';
import { ClubPanel, JobsPanel } from './panels/Club';
import { MatchLive } from './panels/MatchLive';
import { Crest, PlayerDrawer } from './panels/shared';

type GameT = ReturnType<typeof Engine.resumeGame>;
type Tab = 'home' | 'news' | 'squad' | 'transfers' | 'tactics' | 'fixtures' | 'competitions' | 'finances' | 'club' | 'jobs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' }, { id: 'news', label: 'News' }, { id: 'squad', label: 'Squad' }, { id: 'transfers', label: 'Transfers' }, { id: 'tactics', label: 'Tactics' },
  { id: 'fixtures', label: 'Fixtures' }, { id: 'competitions', label: 'Competitions' }, { id: 'finances', label: 'Finances' }, { id: 'club', label: 'Club' }, { id: 'jobs', label: 'Jobs' },
];

export function Game({ record, game }: { record: CareerRecord; game: GameT }) {
  const session = useSession();
  const gameRef = useRef(game);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);
  const [tab, setTab] = useState<Tab>('home');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error' | 'good'; text: string } | null>(null);
  const [live, setLive] = useState<Fixture | null>(null);
  const [lastFixtureId, setLastFixtureId] = useState<string | null>(null);
  const [player, setPlayer] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [stopAtMilestones, setStopAtMilestones] = useState(true);

  const { world, ctx } = gameRef.current;
  const clubId = world.humanClubId ?? record.clubId;
  const club = world.clubs[clubId];
  const maxSeasons = LIMITS[session.plan].maxSeasons;

  const save = useCallback(async () => {
    const g = gameRef.current;
    setSaveState('saving');
    const cid = g.world.humanClubId ?? record.clubId;
    const rec: CareerRecord = { ...record, clubId: cid, clubName: g.world.clubs[cid].name, season: g.world.season, day: g.world.day, summary: summarise(g, cid), snapshot: Engine.snapshotGame(g), updatedAt: new Date().toISOString() };
    try {
      if (record.storage === 'local') await local.put(rec); else await cloud.update(rec);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      if (e instanceof StoreError && e.code === 'season_cap') setPaywall(true);
      else setNotice({ kind: 'error', text: `Save failed: ${(e as Error).message}` });
    }
  }, [record]);

  /** Advance until the club's next match has been played, a milestone needs a decision, or the career ends. */
  function continueToNextMatch() {
    if (busy) return;
    const g = gameRef.current;
    if (g.world.careerOver) return;
    if (Engine.daysLeftInSeason(g.world) === 0 && g.world.season >= maxSeasons) { setPaywall(true); return; }
    setBusy(true); setProgress(0); setNotice(null);
    const start = g.world.day;
    const limit = 60;
    const tick = () => {
      const w = g.world;
      const cid = w.humanClubId ?? clubId;
      const before = w.day;
      const events: Event[] = Engine.step(g, 1);
      const myMatch = events.find((e) => e.type === 'MATCH_PLAYED' && (w.fixtures[e.payload.fixtureId].homeClubId === cid || w.fixtures[e.payload.fixtureId].awayClubId === cid));
      const seasonEnd = Engine.daysLeftInSeason(w) === 0;
      const sd = Engine.seasonDay(w);
      const bid = events.some((e) => e.type === 'BID_RECEIVED');
      const milestone = !stopAtMilestones ? null
        : sd === 0 ? `Season ${w.season} begins. The transfer window is open for four weeks. Check the board's target, the budgets and the market.`
        : sd === Engine.SUMMER_WINDOW[1] ? 'Deadline day for the summer window. Any deals must be done today.'
        : sd === Engine.WINTER_WINDOW[0] ? 'The winter window is open for four weeks.'
        : sd === Engine.WINTER_WINDOW[1] ? 'Deadline day for the winter window.'
        : bid ? 'A club has made an offer for one of your players. Answer it under Transfers → Offers.' : null;
      const stop = myMatch !== undefined || w.careerOver !== null || w.day - start >= limit || (seasonEnd && w.day > before) || milestone !== null;
      setProgress(Math.min(100, ((w.day - start) / 10) * 100));
      if (stop) {
        setBusy(false); setProgress(null); rerender(); void save();
        if (myMatch && myMatch.type === 'MATCH_PLAYED') {
          const f = w.fixtures[myMatch.payload.fixtureId];
          setLastFixtureId(f.id);
          setLive(f);
        } else if (milestone) setNotice({ kind: 'info', text: milestone });
        else if (w.careerOver) setNotice({ kind: 'error', text: `Sacked: ${w.careerOver.reason}` });
        else if (seasonEnd) setNotice({ kind: 'info', text: `Season ${w.season} is complete. Continue to start season ${w.season + 1}.` });
      } else setTimeout(tick, 0);
    };
    tick();
  }

  function openReport() {
    const g = gameRef.current;
    if (session.plan !== 'pro' && session.paymentsEnabled) { setPaywall(true); return; }
    if (g.seasons.length === 0) { setNotice({ kind: 'info', text: 'The season report unlocks once your first season is complete.' }); return; }
    setReportBusy(true);
    try {
      const html = Engine.careerReport(g);
      if (!html) return;
      const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body>${html}</body></html>`;
      const url = URL.createObjectURL(new Blob([page], { type: 'text/html' }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally { setReportBusy(false); }
  }

  function afterAction(result: { ok: boolean; message: string }) {
    setNotice({ kind: result.ok ? 'good' : 'error', text: result.message });
    if (result.ok) { setSaveState('unsaved'); rerender(); void save(); }
  }

  const board = Engine.boardStatus(ctx);
  const seasonDay = Engine.seasonDay(world);
  const ownFixtures = useMemo(() => Object.values(world.fixtures).filter((f) => f.season === world.season && (f.homeClubId === clubId || f.awayClubId === clubId)).sort((a, b) => a.day - b.day), [world, clubId, world.day, world.season]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextFixture: Fixture | undefined = ownFixtures.find((f) => !f.played);
  const lastFixture = (lastFixtureId && world.fixtures[lastFixtureId]) || [...ownFixtures].reverse().find((f) => f.played) || null;
  const league = Engine.leagueOf(world, clubId);
  const daysToNext = nextFixture ? nextFixture.day - world.day : null;
  const bids = world.pendingBids.length;
  const onPlayer = (id: string) => setPlayer(id);
  const goTab = (t: string) => setTab(t as Tab);

  return (
    <div className="game">
      <div className="topbar">
        <div className="who">
          <Crest short={club.short} size="l" />
          <div>
            <h1><small>{record.managerName} · {league?.name ?? ''}</small>{club.name}</h1>
            <p className="muted mono">Season {world.season} · {dayLabel(seasonDay)} · day {seasonDay}{Engine.inTransferWindow(world) ? ' · window open' : ''}{nextFixture ? ` · next match in ${daysToNext} day${daysToNext === 1 ? '' : 's'}` : ''}</p>
          </div>
        </div>
        <div className="actions">
          <span className="muted mono">{saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'not saved' : 'unsaved'}</span>
          <label className="muted small"><input type="checkbox" checked={stopAtMilestones} onChange={(e) => setStopAtMilestones(e.target.checked)} /> stop at windows and offers</label>
          <button className="btn" onClick={() => void save()} disabled={busy}>Save</button>
          <button className="btn" onClick={openReport} disabled={busy || reportBusy}>Season report</button>
          <Link href="/play" className="btn">Careers</Link>
          <button className="btn primary" onClick={continueToNextMatch} disabled={busy || world.careerOver !== null}>
            {busy ? 'Playing…' : world.careerOver ? 'Career over' : nextFixture ? 'Continue to match' : Engine.daysLeftInSeason(world) === 0 ? 'Start next season' : 'Play to season end'}
          </button>
        </div>
      </div>
      {progress !== null ? <div className="progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div> : null}
      {notice ? <p className={`notice ${notice.kind === 'error' ? 'error' : notice.kind === 'good' ? 'good' : ''}`}>{notice.text}</p> : null}
      {world.careerOver ? (
        <section className="panel" style={{ marginBottom: 16 }}>
          <header><h2>Sacked</h2></header>
          <div className="body stack">
            <p>{world.careerOver.reason}. Your time at {club.name} ended in season {world.careerOver.season}. Your reputation follows you: apply for a vacancy under Jobs, or start again.</p>
            <div className="actions"><button className="btn primary" onClick={() => setTab('jobs')}>See vacancies</button><Link href="/play/new" className="btn">Start a new career</Link><Link href="/play" className="btn">Back to careers</Link></div>
          </div>
        </section>
      ) : null}
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}{t.id === 'transfers' && bids ? <span className="badge">{bids}</span> : null}</button>)}
      </div>
      {tab === 'home' ? <HomePanel game={gameRef.current} clubId={clubId} board={board} nextFixture={nextFixture} lastFixture={lastFixture} onPlayer={onPlayer} onTab={goTab} /> : null}
      {tab === 'news' ? <NewsPanel game={gameRef.current} clubId={clubId} onPlayer={onPlayer} /> : null}
      {tab === 'squad' ? <SquadPanel game={gameRef.current} clubId={clubId} onPlayer={onPlayer} /> : null}
      {tab === 'transfers' ? <TransfersPanel game={gameRef.current} clubId={clubId} onAction={afterAction} onPlayer={onPlayer} /> : null}
      {tab === 'tactics' ? <TacticsPanel game={gameRef.current} clubId={clubId} onAction={afterAction} onPlayer={onPlayer} /> : null}
      {tab === 'fixtures' ? <FixturesPanel game={gameRef.current} clubId={clubId} fixtures={ownFixtures} onPlayer={onPlayer} /> : null}
      {tab === 'competitions' ? <CompetitionsPanel game={gameRef.current} clubId={clubId} onPlayer={onPlayer} /> : null}
      {tab === 'finances' ? <FinancesPanel game={gameRef.current} clubId={clubId} board={board} onPlayer={onPlayer} /> : null}
      {tab === 'club' ? <ClubPanel game={gameRef.current} clubId={clubId} board={board} onPlayer={onPlayer} /> : null}
      {tab === 'jobs' ? <JobsPanel game={gameRef.current} onAction={(r) => { afterAction(r); if (r.ok) setTab('home'); }} /> : null}
      {player ? <PlayerDrawer game={gameRef.current} playerId={player} clubId={clubId} onClose={() => setPlayer(null)} onAction={(r) => { afterAction(r); }} /> : null}
      {live ? <MatchLive game={gameRef.current} fixture={live} clubId={clubId} onDone={() => { setLive(null); setTab('home'); }} /> : null}
      {paywall ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
          <div className="modal">
            <p className="eyebrow">Pro</p>
            <h2 id="paywall-title">{Engine.daysLeftInSeason(world) === 0 && world.season >= maxSeasons ? `Free careers stop after season ${LIMITS.free.maxSeasons}` : 'Season reports are a Pro feature'}</h2>
            <p className="muted">Pro removes the {LIMITS.free.maxSeasons}-season limit, keeps careers in the cloud, and adds season reports with charts, final tables, honours and explained matches. This career stays exactly as it is until you upgrade.</p>
            <UpgradeButton signedIn={session.signedIn} enabled={session.paymentsEnabled} label="Upgrade to Pro" />
            <div className="actions"><button className="btn" onClick={() => setPaywall(false)}>Not now</button><Link href="/pricing" className="btn">See plans</Link></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

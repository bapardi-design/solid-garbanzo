'use client';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import Engine, { type Event, type Fixture } from 'sim-engine';
import { LIMITS } from '@/lib/entitlements';
import { useSession } from './session';
import { cloud, local, StoreError, type CareerRecord, type InboxItem } from './store';
import { summarise } from './summary';
import { money } from './format';
import { FinancesPanel, FixturesPanel, MarketPanel, OverviewPanel, SquadPanel, TablePanel, TacticsPanel } from './panels';
import { UpgradeButton } from '@/components/UpgradeButton';

type GameT = ReturnType<typeof Engine.resumeGame>;
type Tab = 'overview' | 'squad' | 'market' | 'tactics' | 'fixtures' | 'table' | 'finances';
export type NewsItem = InboxItem;

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'squad', label: 'Squad' }, { id: 'market', label: 'Transfers' }, { id: 'tactics', label: 'Tactics' },
  { id: 'fixtures', label: 'Fixtures' }, { id: 'table', label: 'Table' }, { id: 'finances', label: 'Finances' },
];

export function Game({ record, game }: { record: CareerRecord; game: GameT }) {
  const session = useSession();
  const gameRef = useRef(game);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error' | 'good'; text: string } | null>(null);
  const [news, setNews] = useState<NewsItem[]>(() => record.summary?.inbox ?? []);
  const [lastResults, setLastResults] = useState<string[]>(() => (record.summary?.lastResults ?? []).filter((id) => game.world.fixtures[id]?.played));
  const newsRef = useRef<{ news: NewsItem[]; lastResults: string[] }>({ news: [], lastResults: [] });
  newsRef.current = { news, lastResults };
  const [reportBusy, setReportBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');

  const { world, ctx } = gameRef.current;
  const clubId = world.humanClubId ?? record.clubId;
  const club = world.clubs[clubId];
  const maxSeasons = LIMITS[session.plan].maxSeasons;

  const save = useCallback(async () => {
    const g = gameRef.current;
    setSaveState('saving');
    const rec: CareerRecord = { ...record, season: g.world.season, day: g.world.day, summary: { ...summarise(g, clubId), inbox: newsRef.current.news.slice(0, 60), lastResults: newsRef.current.lastResults }, snapshot: Engine.snapshotGame(g), updatedAt: new Date().toISOString() };
    try {
      if (record.storage === 'local') await local.put(rec); else await cloud.update(rec);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      if (e instanceof StoreError && e.code === 'season_cap') setPaywall(true);
      else setNotice({ kind: 'error', text: `Save failed: ${(e as Error).message}` });
    }
  }, [record, clubId]);

  function digest(events: Event[]) {
    const g = gameRef.current;
    const w = g.world;
    const items: NewsItem[] = [];
    const played: string[] = [];
    for (const e of events) {
      const item = (text: string) => items.push({ day: e.day - w.seasonStartDay, season: w.season, text });
      switch (e.type) {
        case 'MATCH_PLAYED': {
          const f = w.fixtures[e.payload.fixtureId];
          if (f.homeClubId === clubId || f.awayClubId === clubId) played.push(f.id);
          break;
        }
        case 'MANAGER_SACKED': item(`${w.clubs[e.payload.clubId].name} sack ${w.managers[e.payload.managerId].name} (${e.payload.reason}).`); break;
        case 'PLAYER_TRANSFERRED': {
          const r = e.payload.record;
          if (r.fee > 0 || r.toClubId === clubId || r.fromClubId === clubId) item(`${w.players[r.playerId].name} joins ${w.clubs[r.toClubId].name}${r.fromClubId ? ` from ${w.clubs[r.fromClubId].name}` : ''}${r.fee ? ` for ${money(r.fee)}` : ' on a free'}.`);
          break;
        }
        case 'CONTRACT_EXPIRED': if (e.payload.clubId === clubId) item(`${w.players[e.payload.playerId].name}'s contract has expired. He leaves on a free.`); break;
        case 'PLAYER_INJURED': { const p = w.players[e.payload.playerId]; if (p.clubId === clubId) item(`${p.name} injured, out for ${e.payload.days} days.`); break; }
        case 'CUP_ROUND_ADVANCED': if (e.payload.winnerId) item(`${w.clubs[e.payload.winnerId].name} win the ${w.competitions[e.payload.competitionId].name}.`); break;
        case 'SEASON_ENDED': { const s = e.payload.summary; item(`Season ${s.season} over. Promoted: ${s.promoted.map((id) => w.clubs[id].name).join(', ') || 'none'}. Relegated: ${s.relegated.map((id) => w.clubs[id].name).join(', ') || 'none'}.`); break; }
        case 'SEASON_STARTED': item(`Season ${e.payload.season} begins. The board has set new budgets and a new target.`); break;
        case 'BUDGETS_SET': { const b = e.payload.budgets[clubId]; if (b) item(`Board target: finish ${b.boardTarget}${ordinal(b.boardTarget)}. Transfer budget ${money(b.transferBudget)}, wage budget ${money(b.wageBudget)} a week.`); break; }
        case 'CAREER_ENDED': item(`You have been sacked: ${e.payload.reason}.`); break;
        default: break;
      }
    }
    if (items.length) setNews((n) => [...items.reverse(), ...n].slice(0, 60));
    if (played.length) setLastResults(played);
  }

  /** Advance until the club's next match has been played, a season boundary needs a decision, or the career ends. */
  function continueToNextMatch() {
    if (busy) return;
    const g = gameRef.current;
    if (g.world.careerOver) return;
    if (Engine.daysLeftInSeason(g.world) === 0 && g.world.season >= maxSeasons) { setPaywall(true); return; }
    setBusy(true); setProgress(0); setNotice(null);
    const start = g.world.day;
    const limit = 80;
    const tick = () => {
      const w = g.world;
      const before = w.day;
      const events = Engine.step(g, 1);
      digest(events);
      const playedToday = events.some((e) => e.type === 'MATCH_PLAYED' && (w.fixtures[e.payload.fixtureId].homeClubId === clubId || w.fixtures[e.payload.fixtureId].awayClubId === clubId));
      const seasonEnd = Engine.daysLeftInSeason(w) === 0;
      const sd = Engine.seasonDay(w);
      // Pause where a manager needs to act: new season, and the last day of each transfer window.
      const milestone = sd === 0 ? `Season ${w.season} begins. The transfer window is open for four weeks; check the board's target and your budgets.`
        : sd === 27 ? 'Last day of the summer window. Any deals must be done now.'
        : sd === 168 ? 'The mid-season window is open for four weeks.'
        : sd === 195 ? 'Last day of the mid-season window.' : null;
      const stop = playedToday || w.careerOver !== null || w.day - start >= limit || (seasonEnd && w.day > before) || milestone !== null;
      setProgress(Math.min(100, ((w.day - start) / 14) * 100));
      if (stop) {
        setBusy(false); setProgress(null); rerender(); void save();
        if (milestone) setNotice({ kind: 'info', text: milestone });
        else if (seasonEnd && !playedToday) setNotice({ kind: 'info', text: `Season ${w.season} is complete. Continue to start season ${w.season + 1}.` });
      } else setTimeout(tick, 0);
    };
    tick();
  }

  /** Pro feature: open the multi-season HTML report in a new tab. */
  function openReport() {
    const g = gameRef.current;
    if (session.plan !== 'pro') { setPaywall(true); return; }
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
  const ownFixtures = useMemo(() => Object.values(world.fixtures).filter((f) => f.season === world.season && (f.homeClubId === clubId || f.awayClubId === clubId)).sort((a, b) => a.day - b.day), [world, clubId, world.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextFixture: Fixture | undefined = ownFixtures.find((f) => !f.played);

  return (
    <div>
      <div className="topbar">
        <h1><small>{record.managerName} · {club.name}</small>Season {world.season} · week {Math.floor(seasonDay / 7) + 1}</h1>
        <div className="actions">
          <span className="muted mono">{saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'not saved' : 'unsaved'}</span>
          <button className="btn" onClick={() => void save()} disabled={busy}>Save</button>
          <button className="btn" onClick={openReport} disabled={busy || reportBusy} title={session.plan === 'pro' ? 'Charts, tables and explained matches for every completed season' : 'Pro feature'}>Season report{session.plan === 'pro' ? '' : ' · Pro'}</button>
          <Link href="/play" className="btn">Careers</Link>
          <button className="btn primary" onClick={continueToNextMatch} disabled={busy || world.careerOver !== null}>
            {busy ? 'Playing…' : world.careerOver ? 'Career over' : nextFixture ? `Play to next match` : Engine.daysLeftInSeason(world) === 0 ? 'Start next season' : 'Play to season end'}
          </button>
        </div>
      </div>
      {progress !== null ? <div className="progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div> : null}
      {notice ? <p className={`notice ${notice.kind === 'error' ? 'error' : notice.kind === 'good' ? 'good' : ''}`}>{notice.text}</p> : null}
      {world.careerOver ? (
        <section className="panel" style={{ marginBottom: 16 }}>
          <header><h2>Sacked</h2></header>
          <div className="body stack">
            <p>{world.careerOver.reason}. Your time at {club.name} ended in season {world.careerOver.season}.</p>
            <div className="actions"><Link href="/play/new" className="btn primary">Start a new career</Link><Link href="/play" className="btn">Back to careers</Link></div>
          </div>
        </section>
      ) : null}
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'overview' ? <OverviewPanel game={gameRef.current} clubId={clubId} board={board} news={news} lastResults={lastResults} nextFixture={nextFixture} /> : null}
      {tab === 'squad' ? <SquadPanel game={gameRef.current} clubId={clubId} onAction={afterAction} /> : null}
      {tab === 'market' ? <MarketPanel game={gameRef.current} clubId={clubId} onAction={afterAction} /> : null}
      {tab === 'tactics' ? <TacticsPanel game={gameRef.current} clubId={clubId} onAction={afterAction} /> : null}
      {tab === 'fixtures' ? <FixturesPanel game={gameRef.current} clubId={clubId} fixtures={ownFixtures} /> : null}
      {tab === 'table' ? <TablePanel game={gameRef.current} clubId={clubId} /> : null}
      {tab === 'finances' ? <FinancesPanel game={gameRef.current} clubId={clubId} board={board} /> : null}
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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import Engine, { type Club } from 'sim-engine';
import { useSession } from './session';
import { cloud, local, newLocalId, StoreError, type CareerRecord } from './store';
import { summarise } from './summary';
import { money } from './format';
import { Crest, Flag, Ovr } from './panels/shared';

const WORDS = ['anfield', 'bernabeu', 'camp-nou', 'san-siro', 'allianz', 'parc', 'etihad', 'emirates', 'signal-iduna', 'wanda', 'olimpico', 'velodrome'];
const randomSeed = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(Math.random() * 900 + 100)}`;

type GameT = ReturnType<typeof Engine.createGame>;

export function NewCareer() {
  const router = useRouter();
  const session = useSession();
  const [seed, setSeed] = useState(randomSeed);
  const [worldKind, setWorldKind] = useState<'real' | 'custom'>('real');
  const [nations, setNations] = useState<string[]>(['ENG', 'ESP', 'GER', 'ITA', 'FRA']);
  const [managerName, setManagerName] = useState('');
  const [game, setGame] = useState<GameT | null>(null);
  const [building, setBuilding] = useState(false);
  const [nation, setNation] = useState('ENG');
  const [tier, setTier] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function build(e: React.FormEvent) {
    e.preventDefault();
    setBuilding(true); setGame(null); setPicked(null);
    setTimeout(() => {
      const g = worldKind === 'real'
        ? Engine.createGame({ ...Engine.DEFAULT_CONFIG, seed: seed.trim() || 'alpha', nations })
        : Engine.createGame({ ...Engine.CUSTOM_CONFIG, seed: seed.trim() || 'alpha' });
      Engine.step(g, 1); // day 0: competitions, budgets and board targets exist
      setGame(g);
      const first = Object.keys(g.world.nations)[0];
      setNation(nations.includes(nation) && g.world.nations[nation] ? nation : first);
      setTier(1);
      setBuilding(false);
    }, 20);
  }

  async function start() {
    if (!game || !picked) return;
    setBusy(true); setNotice(null);
    const name = managerName.trim() || 'The Gaffer';
    Engine.takeOverClub(game.ctx, picked, name);
    const club = game.world.clubs[picked];
    const base: Omit<CareerRecord, 'id' | 'storage' | 'updatedAt'> = {
      name: `${club.name} · ${seed}`,
      managerName: name,
      clubId: picked,
      clubName: club.name,
      seed: game.world.config.seed,
      season: game.world.season,
      day: game.world.day,
      summary: summarise(game, picked),
      snapshot: Engine.snapshotGame(game),
    };
    try {
      if (session.signedIn && worldKind === 'custom') {
        try {
          const id = await cloud.create(base);
          router.push(`/play/${id}`);
          return;
        } catch (err) {
          if (!(err instanceof StoreError && err.code === 'career_cap')) throw err;
          setNotice(`${err.message} This career will save on this device instead.`);
        }
      }
      const id = newLocalId();
      await local.put({ ...base, id, storage: 'local', updatedAt: new Date().toISOString() });
      router.push(`/play/${id}`);
    } catch (err) {
      setNotice((err as Error).message);
      setBusy(false);
    }
  }

  const world = game?.world ?? null;
  const nationList = world ? Object.values(world.nations).sort((a, b) => b.coefficient - a.coefficient) : [];
  const current = world?.nations[nation];
  const clubs = useMemo(() => {
    if (!world) return [] as { club: Club; league: string; rank: number; best: string; strength: number }[];
    return Object.values(world.clubs)
      .filter((c) => c.nationId === nation && Engine.tierFromLeagueId(c.leagueId) === tier)
      .map((c) => {
        const best = Engine.squad(world, c.id).sort((a, b) => Engine.overall(b) - Engine.overall(a))[0];
        return { club: c, league: Engine.leagueOf(world, c.id)?.name ?? '', rank: c.boardTarget, best: best ? `${best.name} (${Math.round(Engine.overall(best))})` : '–', strength: Engine.squadStrength(world, c.id) };
      })
      .sort((a, b) => a.rank - b.rank);
  }, [world, nation, tier]);
  const toggleNation = (id: string) => setNations((ns) => (ns.includes(id) ? (ns.length > 1 ? ns.filter((n) => n !== id) : ns) : [...ns, id]));

  return (
    <div className="stack">
      <form onSubmit={build} className="panel">
        <header><h3>World</h3><span className="muted">the same seed always builds the same world</span></header>
        <div className="body stack">
          <div className="form-row">
            <div className="field"><label>World</label>
              <div className="chips">
                <button type="button" className={worldKind === 'real' ? 'on' : ''} onClick={() => setWorldKind('real')}>Real clubs and players</button>
                <button type="button" className={worldKind === 'custom' ? 'on' : ''} onClick={() => setWorldKind('custom')}>Fictional small world</button>
              </div>
            </div>
            {worldKind === 'real' ? (
              <div className="field"><label>Nations included</label>
                <div className="chips">{Object.values(Engine.NATIONS).filter((n) => n.id !== 'CUS').map((n) => <button type="button" key={n.id} className={nations.includes(n.id) ? 'on' : ''} onClick={() => toggleNation(n.id)}>{n.name} <span className="muted">({n.tiers.reduce((a, b) => a + b, 0)} clubs)</span></button>)}</div>
              </div>
            ) : null}
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="seed">Seed</label><input id="seed" type="text" value={seed} onChange={(e) => setSeed(e.target.value)} /></div>
            <div className="field"><label htmlFor="mgr">Your name</label><input id="mgr" type="text" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="The Gaffer" /></div>
            <button className="btn primary" type="submit" disabled={building}>{building ? 'Building world…' : game ? 'Rebuild world' : 'Build world'}</button>
            <button className="btn" type="button" onClick={() => setSeed(randomSeed())}>Random seed</button>
            {worldKind === 'real' ? <span className="muted">Building the real world takes a few seconds: about 250 clubs and 7,000 players.</span> : null}
          </div>
        </div>
      </form>
      {notice ? <p className="notice">{notice}</p> : null}
      {world && current ? (
        <section className="panel">
          <header>
            <h3>Choose a club</h3>
            <span className="muted">{Object.keys(world.clubs).length} clubs · {Object.keys(world.players).length.toLocaleString('en-GB')} players</span>
          </header>
          <div className="tabs sub" role="tablist">{nationList.map((n) => <button key={n.id} role="tab" aria-selected={nation === n.id} onClick={() => { setNation(n.id); setTier(1); }}>{n.name}</button>)}</div>
          <div className="chips">{current.tiers.map((_, i) => <button key={i} className={tier === i + 1 ? 'on' : ''} onClick={() => setTier(i + 1)}>{current.leagueNames[i] ?? `Tier ${i + 1}`}</button>)}</div>
          <div className="scroll">
            <table>
              <thead><tr><th></th><th>Club</th><th>City</th><th className="num">Board rank</th><th className="num">Rep</th><th className="num">Squad</th><th className="num">Stadium</th><th className="num">Bank</th><th>Best player</th><th></th></tr></thead>
              <tbody>
                {clubs.map(({ club, rank, best, strength }) => {
                  const n = clubs.length;
                  const difficulty = rank <= n / 4 ? 'easy' : rank <= (3 * n) / 4 ? 'medium' : 'hard';
                  return (
                    <tr key={club.id} className={picked === club.id ? 'mine' : ''} onClick={() => setPicked(club.id)} style={{ cursor: 'pointer' }}>
                      <td><Crest short={club.short} /></td>
                      <td><b>{club.name}</b> <Flag nat={club.nationId} /></td>
                      <td className="muted">{club.city}</td>
                      <td className="num">{rank} <span className={`pill ${difficulty === 'easy' ? 'good' : difficulty === 'medium' ? 'warn' : 'bad'}`}>{difficulty}</span></td>
                      <td className="num">{club.reputation}</td>
                      <td className="num"><Ovr v={strength} /></td>
                      <td className="num">{club.stadiumCapacity.toLocaleString('en-GB')}</td>
                      <td className="num">{money(club.balance, Engine.currencyFor(world, club.id))}</td>
                      <td>{best}</td>
                      <td><button className="btn small" type="button" onClick={(e) => { e.stopPropagation(); setPicked(club.id); }} aria-pressed={picked === club.id}>{picked === club.id ? 'Selected' : 'Select'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="body actions">
            <button className="btn primary" disabled={!picked || busy} onClick={start}>{busy ? 'Starting…' : picked ? `Take over ${world.clubs[picked].name}` : 'Select a club'}</button>
            <span className="muted">{worldKind === 'real' ? 'Real-world careers save on this device (they are too big for cloud saves right now).' : !session.signedIn ? 'Saves on this device. Sign in to save to the cloud.' : ''}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

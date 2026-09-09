'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Engine from 'sim-engine';
import { useSession } from './session';
import { cloud, local, newLocalId, StoreError, type CareerRecord } from './store';
import { summarise } from './summary';

const WORDS = ['ashford', 'bramley', 'calder', 'dunmore', 'eastvale', 'fairbank', 'glenrock', 'harlow', 'juniper', 'kingsmere', 'larkhill', 'millbrook'];
const randomSeed = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(Math.random() * 900 + 100)}`;

export function NewCareer() {
  const router = useRouter();
  const session = useSession();
  const [seed, setSeed] = useState(randomSeed);
  const [leagues, setLeagues] = useState(2);
  const [clubs, setClubs] = useState(12);
  const [managerName, setManagerName] = useState('');
  const [game, setGame] = useState<ReturnType<typeof Engine.createGame> | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function build(e: React.FormEvent) {
    e.preventDefault();
    const g = Engine.createGame({ seed: seed.trim() || 'alpha', leagues, clubsPerLeague: clubs });
    Engine.step(g, 1); // day 0: competitions, budgets and board targets exist
    setGame(g);
    setPicked(null);
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
      if (session.signedIn) {
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

  const offers = game ? Engine.jobOffers(game.ctx) : [];

  return (
    <div className="stack">
      <form onSubmit={build} className="panel">
        <header><h3>World</h3></header>
        <div className="body form-row">
          <div className="field"><label htmlFor="seed">Seed</label><input id="seed" type="text" value={seed} onChange={(e) => setSeed(e.target.value)} /></div>
          <div className="field"><label htmlFor="leagues">Divisions</label><select id="leagues" value={leagues} onChange={(e) => setLeagues(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></div>
          <div className="field"><label htmlFor="clubs">Clubs per division</label><select id="clubs" value={clubs} onChange={(e) => setClubs(Number(e.target.value))}><option value={8}>8</option><option value={10}>10</option><option value={12}>12</option><option value={16}>16</option><option value={20}>20</option></select></div>
          <div className="field"><label htmlFor="mgr">Your name</label><input id="mgr" type="text" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="The Gaffer" /></div>
          <button className="btn primary" type="submit">{game ? 'Rebuild world' : 'Build world'}</button>
          <button className="btn" type="button" onClick={() => setSeed(randomSeed())}>Random seed</button>
        </div>
      </form>
      {notice ? <p className="notice">{notice}</p> : null}
      {game ? (
        <section className="panel">
          <header><h3>Vacancies</h3><span className="muted">{offers.length} clubs</span></header>
          <div className="scroll">
            <table>
              <thead><tr><th>Club</th><th>Division</th><th className="num">Board rank</th><th>Difficulty</th><th className="num">Reputation</th><th className="num">Bank</th><th className="num">Squad</th><th></th></tr></thead>
              <tbody>
                {offers.map(({ club, tier, strengthRank, difficulty }) => (
                  <tr key={club.id} className={picked === club.id ? 'mine' : ''}>
                    <td>{club.name}</td>
                    <td>Div {tier}</td>
                    <td className="num">{strengthRank}</td>
                    <td><span className={`pill ${difficulty === 'easy' ? 'good' : difficulty === 'medium' ? 'warn' : 'bad'}`}>{difficulty}</span></td>
                    <td className="num">{club.reputation}</td>
                    <td className="num">£{(club.balance / 1000).toFixed(1)}m</td>
                    <td className="num">{game.world.idx.squadByClub[club.id]?.length ?? 0}</td>
                    <td><button className="btn small" type="button" onClick={() => setPicked(club.id)} aria-pressed={picked === club.id}>{picked === club.id ? 'Selected' : 'Select'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="body actions">
            <button className="btn primary" disabled={!picked || busy} onClick={start}>{busy ? 'Starting…' : picked ? `Take over ${game.world.clubs[picked].name}` : 'Select a club'}</button>
            {!session.signedIn ? <span className="muted">Saves on this device. Sign in to save to the cloud.</span> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

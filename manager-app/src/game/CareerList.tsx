'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from './session';
import { cloud, local, type CareerMeta } from './store';
import { money } from './format';

export function CareerList() {
  const session = useSession();
  const [careers, setCareers] = useState<CareerMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<{ plan: string; maxCareers: number; maxSeasons: number } | null>(null);

  async function load() {
    try {
      const mine = await local.list();
      let remote: CareerMeta[] = [];
      if (session.signedIn) {
        const r = await cloud.list();
        remote = r.careers;
        setLimits({ plan: r.plan, maxCareers: r.maxCareers, maxSeasons: r.maxSeasons });
      }
      setCareers([...remote, ...mine]);
    } catch (e) {
      setError((e as Error).message);
      setCareers([]);
    }
  }
  useEffect(() => { void load(); }, [session.signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(c: CareerMeta) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    if (c.storage === 'local') await local.remove(c.id); else await cloud.remove(c.id);
    await load();
  }

  return (
    <div className="stack">
      <div className="actions">
        <Link href="/play/new" className="btn primary">New career</Link>
        {limits ? <span className="muted">{limits.plan} plan · {careers?.filter((c) => c.storage === 'cloud').length ?? 0}/{limits.maxCareers} cloud careers</span> : null}
        {!session.signedIn && session.authEnabled ? <Link href="/login?next=/play" className="btn">Sign in for cloud saves</Link> : null}
      </div>
      {error ? <p className="notice error">{error}</p> : null}
      {careers === null ? <p className="muted">Loading…</p> : careers.length === 0 ? (
        <p className="empty">No careers yet. Start one and take over a club.</p>
      ) : (
        <div className="cards">
          {careers.map((c) => (
            <article className="card" key={c.id}>
              <h3>{c.clubName}</h3>
              <div className="meta">{c.managerName} · season {c.season} · {c.storage === 'cloud' ? 'cloud' : 'this device'}</div>
              <div className="muted">
                {c.summary?.careerOver ? <span className="pill bad">sacked</span> : <span className="pill">{c.summary?.leagueName ?? `Div ${c.summary?.tier ?? '?'}`} · {c.summary?.position ?? '?'}th</span>}{' '}
                <span className="mono">{money(c.summary?.balance ?? 0)}</span>{' '}
                {c.summary?.world === 'real' ? <span className="pill accent">real world</span> : null}
              </div>
              <div className="actions">
                <Link href={`/play/${c.id}`} className="btn primary small">{c.summary?.careerOver ? 'Review' : 'Continue'}</Link>
                <button className="btn small danger" onClick={() => remove(c)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSession } from './session';
import { cloud, local, newLocalId, type CareerMeta, type CareerRecord } from './store';
import { exportCareer, exportFilename, importCareer } from './portable';
import { money } from './format';

export function CareerList() {
  const session = useSession();
  const [careers, setCareers] = useState<CareerMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<{ plan: string; maxCareers: number; maxSeasons: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

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

  /** Saves a career to a file the manager can keep or send to someone. */
  async function save(c: CareerMeta) {
    setBusy(c.id);
    setNote(null);
    try {
      const record = c.storage === 'cloud' ? await cloud.get(c.id) : await local.get(c.id);
      if (!record) throw new Error('That career could not be read.');
      const blob = await exportCareer(record);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename(record);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNote(`${record.clubName} saved to a file.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /** Takes a career file and puts it on this device. */
  async function open(f: File) {
    setBusy('import');
    setError(null);
    setNote(null);
    try {
      const incoming = await importCareer(f);
      const record: CareerRecord = {
        ...incoming,
        id: newLocalId(),
        storage: 'local',
        updatedAt: new Date().toISOString(),
        name: incoming.name,
      };
      await local.put(record);
      setNote(`${record.clubName} loaded. It is on this device now.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (file.current) file.current.value = '';
    }
  }

  return (
    <div className="stack">
      <div className="actions">
        <Link href="/play/new" className="btn primary">New career</Link>
        <button className="btn" disabled={busy === 'import'} onClick={() => file.current?.click()}>{busy === 'import' ? 'Loading…' : 'Load from a file'}</button>
        <input ref={file} type="file" accept=".touchline,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void open(f); }} />
        {limits ? <span className="muted">{limits.plan} plan · {careers?.filter((c) => c.storage === 'cloud').length ?? 0}/{limits.maxCareers} cloud careers</span> : null}
        {!session.signedIn && session.authEnabled ? <Link href="/login?next=/play" className="btn">Sign in for cloud saves</Link> : null}
      </div>
      {error ? <p className="notice error">{error}</p> : null}
      {note ? <p className="notice">{note}</p> : null}
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
                <button className="btn small" disabled={busy === c.id} onClick={() => save(c)}>{busy === c.id ? 'Saving…' : 'Save to file'}</button>
                <button className="btn small danger" onClick={() => remove(c)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

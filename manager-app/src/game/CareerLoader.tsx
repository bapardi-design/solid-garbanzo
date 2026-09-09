'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Engine from 'sim-engine';
import { Game } from './Game';
import { cloud, isLocalId, local, type CareerRecord } from './store';

export function CareerLoader({ id }: { id: string }) {
  const [record, setRecord] = useState<CareerRecord | null>(null);
  const [game, setGame] = useState<ReturnType<typeof Engine.resumeGame> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = isLocalId(id) ? await local.get(id) : await cloud.get(id);
        if (!r) throw new Error('Career not found on this device.');
        if (cancelled) return;
        setRecord(r);
        setGame(Engine.resumeGame(r.snapshot));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <div className="stack"><p className="notice error">{error}</p><Link href="/play" className="btn">Back to careers</Link></div>;
  if (!record || !game) return <p className="muted">Loading career…</p>;
  return <Game record={record} game={game} />;
}

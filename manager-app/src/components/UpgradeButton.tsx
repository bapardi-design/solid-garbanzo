'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function UpgradeButton({ signedIn, enabled, label = 'Go Pro' }: { signedIn: boolean; enabled: boolean; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    if (!signedIn) { router.push('/login?next=/pricing'); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Checkout unavailable');
      window.location.href = body.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  if (!enabled) return <span className="muted">Payments are not switched on yet.</span>;
  return (
    <div className="actions">
      <button className="btn primary" onClick={go} disabled={busy}>{busy ? 'Opening checkout…' : label}</button>
      {error ? <span className="muted">{error}</span> : null}
    </div>
  );
}

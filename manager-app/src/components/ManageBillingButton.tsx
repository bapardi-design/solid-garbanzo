'use client';
import { useState } from 'react';

export function ManageBillingButton({ enabled, renewsAt }: { enabled: boolean; renewsAt: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Billing portal unavailable');
      window.location.href = body.url;
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return (
    <div className="actions">
      {renewsAt ? <span className="muted">Renews {new Date(renewsAt).toLocaleDateString('en-GB')}</span> : null}
      {enabled ? <button className="btn" onClick={open} disabled={busy}>{busy ? 'Opening…' : 'Manage subscription'}</button> : null}
      {error ? <span className="muted">{error}</span> : null}
    </div>
  );
}

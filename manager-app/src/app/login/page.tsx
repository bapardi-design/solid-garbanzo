'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/play';
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(params.get('error') === 'link' ? 'That sign-in link has expired. Request a new one.' : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending'); setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setState('error'); setMessage(error.message); return; }
    setState('sent');
  }

  if (!hasSupabaseEnv()) {
    return <p className="notice">Accounts are not switched on in this deployment. You can still play with local saves.</p>;
  }
  if (state === 'sent') {
    return <p className="notice good">Check your inbox. We sent a sign-in link to <b>{email}</b>.</p>;
  }
  return (
    <form onSubmit={submit} className="stack" style={{ maxWidth: 420 }}>
      {message ? <p className="notice error">{message}</p> : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      </div>
      <div className="actions">
        <button className="btn primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button>
      </div>
      <p className="muted">No password. The link signs you in on this device.</p>
    </form>
  );
}

export default function Login() {
  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Account</p>
        <h1>Sign in</h1>
        <p className="lede">Sign in to keep careers in the cloud and to upgrade to Pro. Playing without an account keeps saves on this device.</p>
        <Suspense><LoginForm /></Suspense>
      </div>
    </main>
  );
}

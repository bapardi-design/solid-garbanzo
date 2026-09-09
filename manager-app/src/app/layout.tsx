import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { currentUser, supabaseConfigured } from '@/lib/supabase/server';
import { stripeConfigured } from '@/lib/stripe';
import { SessionProvider, type SessionInfo } from '@/game/session';

export const metadata: Metadata = {
  title: { default: 'Touchline', template: '%s · Touchline' },
  description: 'Take over a football club. Tactics, transfers, contracts, and the board breathing down your neck. Runs in your browser.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const session: SessionInfo = {
    signedIn: Boolean(user),
    email: user?.email ?? null,
    plan: user?.plan ?? 'free',
    authEnabled: supabaseConfigured(),
    paymentsEnabled: stripeConfigured(),
  };
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        <SessionProvider value={session}>
          <header className="site-header">
            <div className="wrap">
              <Link href="/" className="brand"><small>Football manager</small>Touchline</Link>
              <nav className="nav" aria-label="Main">
                <Link href="/play">Play</Link>
                <Link href="/pricing">Pricing</Link>
                {user ? (
                  <>
                    <Link href="/account">Account</Link>
                    <span className={`plan${user.plan === 'pro' ? ' pro' : ''}`}>{user.plan}</span>
                  </>
                ) : session.authEnabled ? (
                  <Link href="/login">Sign in</Link>
                ) : null}
              </nav>
            </div>
          </header>
          {children}
          <footer className="site-footer"><div className="wrap">Touchline · deterministic football management in your browser.</div></footer>
        </SessionProvider>
      </body>
    </html>
  );
}

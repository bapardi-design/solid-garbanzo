import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';
import { stripeConfigured } from '@/lib/stripe';
import { LIMITS, PRO_PRICE_LABEL } from '@/lib/entitlements';
import { UpgradeButton } from '@/components/UpgradeButton';
import { ManageBillingButton } from '@/components/ManageBillingButton';

export const metadata = { title: 'Account' };

export default async function Account({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login?next=/account');
  const { upgraded } = await searchParams;
  const limits = LIMITS[user.plan];
  return (
    <main className="page">
      <div className="wrap stack" style={{ maxWidth: 720 }}>
        <div>
          <p className="eyebrow">Account</p>
          <h1>{user.email}</h1>
        </div>
        {upgraded ? <p className="notice good">Thanks. Pro unlocks as soon as the payment confirms, usually within a few seconds. Reload if this page still says free.</p> : null}
        <section className="panel">
          <header><h3>Plan</h3><span className={`pill${user.plan === 'pro' ? ' accent' : ''}`}>{user.plan}</span></header>
          <div className="body stack">
            <p className="muted">{limits.maxSeasons >= 999 ? 'Unlimited seasons' : `${limits.maxSeasons} seasons per career`} · {limits.maxCareers} cloud career{limits.maxCareers === 1 ? '' : 's'} · season reports {limits.reports ? 'included' : 'not included'}</p>
            {user.plan === 'pro' ? (
              <ManageBillingButton enabled={stripeConfigured() && Boolean(user.stripeCustomerId)} renewsAt={user.planExpiresAt} />
            ) : (
              <UpgradeButton signedIn enabled={stripeConfigured()} label={`Go Pro for ${PRO_PRICE_LABEL}`} />
            )}
          </div>
        </section>
        <form action="/auth/signout" method="post">
          <button className="btn">Sign out</button>
        </form>
      </div>
    </main>
  );
}

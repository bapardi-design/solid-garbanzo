import Link from 'next/link';
import { LIMITS, PRO_PRICE_LABEL } from '@/lib/entitlements';
import { currentUser } from '@/lib/supabase/server';
import { stripeConfigured } from '@/lib/stripe';
import { UpgradeButton } from '@/components/UpgradeButton';

export const metadata = { title: 'Pricing' };

export default async function Pricing() {
  const user = await currentUser();
  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Pricing</p>
        <h1>One plan. No loot boxes.</h1>
        <p className="lede">Free careers stop after {LIMITS.free.maxSeasons} seasons and stay on this device. Pro removes the limits and keeps your careers in the cloud. Cancel any time from your account.</p>
        <div className="plans">
          <div className="plan-card">
            <h3>Free</h3>
            <div className="price">£0</div>
            <ul>
              <li>{LIMITS.free.maxSeasons} seasons per career</li>
              <li>{LIMITS.free.maxCareers} cloud career when signed in</li>
              <li>Local saves without an account</li>
            </ul>
            <Link href="/play/new" className="btn">Start free</Link>
          </div>
          <div className="plan-card featured">
            <h3>Pro</h3>
            <div className="price">{PRO_PRICE_LABEL}</div>
            <ul>
              <li>Unlimited seasons</li>
              <li>Up to {LIMITS.pro.maxCareers} cloud careers</li>
              <li>Season reports with charts and explained matches</li>
              <li>Priority on new features</li>
            </ul>
            {user?.plan === 'pro' ? <span className="pill accent">You are on Pro</span> : <UpgradeButton signedIn={Boolean(user)} enabled={stripeConfigured()} />}
          </div>
        </div>
      </div>
    </main>
  );
}

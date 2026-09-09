import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/supabase/server';
import { appUrl, stripe, stripeConfigured } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST() {
  if (!stripeConfigured()) return NextResponse.json({ error: 'payments_not_configured' }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!user.stripeCustomerId) return NextResponse.json({ error: 'no_customer' }, { status: 400 });
  const session = await stripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${appUrl()}/account` });
  return NextResponse.json({ url: session.url });
}

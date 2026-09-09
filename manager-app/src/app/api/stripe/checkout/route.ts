import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentUser } from '@/lib/supabase/server';
import { appUrl, stripe, stripeConfigured } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST() {
  if (!stripeConfigured()) return NextResponse.json({ error: 'payments_not_configured' }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customerId = customer.id;
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO!, quantity: 1 }],
    success_url: `${appUrl()}/account?upgraded=1`,
    cancel_url: `${appUrl()}/pricing`,
    allow_promotion_codes: true,
    metadata: { user_id: user.id },
  });
  return NextResponse.json({ url: session.url });
}

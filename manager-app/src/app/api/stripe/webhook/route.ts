import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

async function applySubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const active = ACTIVE.has(sub.status);
  const periodEnd = sub.items.data[0]?.current_period_end;
  await admin
    .from('profiles')
    .update({
      plan: active ? 'pro' : 'free',
      stripe_subscription_id: sub.id,
      plan_expires_at: active && periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('stripe_customer_id', customerId);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `invalid_signature: ${(err as Error).message}` }, { status: 400 });
  }
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripe().subscriptions.retrieve(typeof session.subscription === 'string' ? session.subscription : session.subscription.id);
        await applySubscription(sub);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await applySubscription(event.data.object);
      break;
    default:
      break;
  }
  return NextResponse.json({ received: true });
}

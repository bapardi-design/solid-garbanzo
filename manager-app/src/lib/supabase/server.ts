import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Plan } from '@/lib/entitlements';
import { isPlanActive } from '@/lib/entitlements';

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Cookie-backed client for server components and route handlers (acts as the signed-in user). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a server component; middleware refreshes the session instead.
        }
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string | null;
  plan: Plan;
  planExpiresAt: string | null;
  stripeCustomerId: string | null;
}

/** The signed-in user with their effective plan, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('plan, plan_expires_at, stripe_customer_id').eq('id', user.id).maybeSingle();
  const plan = (profile?.plan ?? 'free') as Plan;
  const active = isPlanActive(plan, profile?.plan_expires_at ?? null);
  return {
    id: user.id,
    email: user.email ?? null,
    plan: active ? 'pro' : 'free',
    planExpiresAt: profile?.plan_expires_at ?? null,
    stripeCustomerId: profile?.stripe_customer_id ?? null,
  };
}

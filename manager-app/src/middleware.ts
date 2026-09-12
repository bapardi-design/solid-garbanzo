import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { GATE_COOKIE, gateToken, sameSecret, sitePassword } from '@/lib/gate';

/** The door itself, and the call that opens it, are the only ways through it. */
const GATE_PATHS = ['/gate', '/api/gate'];

/**
 * Turns away anyone without the site password, when one is set. Stripe's
 * webhook is exempt: it is signed, it is not a person, and it cannot be asked
 * for a password.
 */
async function guard(request: NextRequest): Promise<NextResponse | null> {
  const password = sitePassword();
  if (!password) return null;
  const { pathname } = request.nextUrl;
  if (GATE_PATHS.includes(pathname) || pathname === '/api/stripe/webhook') return null;
  const held = request.cookies.get(GATE_COOKIE)?.value;
  if (held && sameSecret(held, await gateToken(password))) return null;
  const gate = request.nextUrl.clone();
  gate.pathname = '/gate';
  gate.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(gate);
}

/** Refreshes the Supabase session cookie on every request so server components see a valid user. */
export async function middleware(request: NextRequest) {
  const turnedAway = await guard(request);
  if (turnedAway) return turnedAway;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

import { NextResponse } from 'next/server';
import { GATE_COOKIE, gateToken, sameSecret, sitePassword } from '@/lib/gate';

export const runtime = 'nodejs';

/** A month, so a friend answers once rather than every visit. */
const MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const password = sitePassword();
  if (!password) return NextResponse.json({ error: 'no_password_set' }, { status: 503 });
  const form = await request.formData();
  const given = String(form.get('password') ?? '');
  const next = String(form.get('next') ?? '/');
  const url = new URL(request.url);
  if (!sameSecret(given, password)) {
    return NextResponse.redirect(new URL(`/gate?wrong=1${next === '/' ? '' : `&next=${encodeURIComponent(next)}`}`, url), 303);
  }
  // Only ever back into this site: `next` comes off a query string, so a bare
  // path and nothing that could send someone somewhere else entirely.
  const target = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const response = NextResponse.redirect(new URL(target, url), 303);
  response.cookies.set(GATE_COOKIE, await gateToken(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    path: '/',
    maxAge: MAX_AGE,
  });
  return response;
}

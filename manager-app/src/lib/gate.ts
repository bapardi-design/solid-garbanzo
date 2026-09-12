/**
 * A shared password in front of the whole site, for showing an unfinished game
 * to a few people without putting it on the open web. Vercel has this built in
 * but only on a paid plan, so it lives in the app instead.
 *
 * It is a door, not an account system: everyone who gets in shares one
 * password, and getting in tells the app nothing about who you are. Signing in
 * to save a career is separate and unaffected.
 */
export const GATE_COOKIE = 'touchline_gate';

/** Unset means no door: local development, CI and the tests run unguarded. */
export function sitePassword(): string | null {
  const value = process.env.SITE_PASSWORD;
  return value && value.length > 0 ? value : null;
}

/**
 * What a browser that has answered correctly carries. Derived from the
 * password so there is no second secret to keep, and so changing the password
 * turns every issued cookie into a wrong answer.
 *
 * Web Crypto rather than node:crypto: the middleware runs on the edge.
 */
export async function gateToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('touchline-gate-v1'));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares without leaking where two values first differ. */
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

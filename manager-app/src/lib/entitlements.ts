/** Plan limits enforced on the server and mirrored in the UI. */
export type Plan = 'free' | 'pro';

export interface Limits {
  /** Cloud careers a user may keep. */
  maxCareers: number;
  /** Highest season a career may reach. */
  maxSeasons: number;
  /** Season reports (HTML) available. */
  reports: boolean;
}

export const LIMITS: Record<Plan, Limits> = {
  free: { maxCareers: 1, maxSeasons: 2, reports: false },
  pro: { maxCareers: 50, maxSeasons: 999, reports: true },
};

export const PRO_PRICE_LABEL = '£4.99 / month';

export function limitsFor(plan: Plan): Limits {
  return LIMITS[plan] ?? LIMITS.free;
}

export function isPlanActive(plan: Plan, expiresAt: string | null): boolean {
  if (plan !== 'pro') return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

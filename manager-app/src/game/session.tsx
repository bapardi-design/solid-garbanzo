'use client';
/** Client-side view of the signed-in user and their plan, shared by pages. */
import { createContext, useContext } from 'react';
import type { Plan } from '@/lib/entitlements';

export interface SessionInfo {
  signedIn: boolean;
  email: string | null;
  plan: Plan;
  authEnabled: boolean;
  paymentsEnabled: boolean;
}

export const SessionContext = createContext<SessionInfo>({ signedIn: false, email: null, plan: 'free', authEnabled: false, paymentsEnabled: false });

export function useSession(): SessionInfo { return useContext(SessionContext); }

export function SessionProvider({ value, children }: { value: SessionInfo; children: React.ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

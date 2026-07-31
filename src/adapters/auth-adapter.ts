import type { AuthenticatedUser, UserRole } from "@/types/auth";

/**
 * Every protected page/action must go through this interface — never a client-supplied role,
 * query param, or localStorage flag (spec section 11/48). Swapping the mock implementation for
 * real session-based auth later means changing only mock-auth-adapter.ts.
 */
export interface AuthAdapter {
  getCurrentUser(): Promise<AuthenticatedUser | null>;
  /** Throws if nobody is signed in. */
  requireUser(): Promise<AuthenticatedUser>;
  /** Throws unless the signed-in user has exactly this role (admins are always allowed through). */
  requireRole(role: UserRole): Promise<AuthenticatedUser>;
}

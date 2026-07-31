import { cookies } from "next/headers";
import { DEMO_USERS } from "@/data/demo-users";
import type { AuthenticatedUser, UserRole } from "@/types/auth";
import type { AuthAdapter } from "./auth-adapter";

/**
 * Demo-only stand-in for real auth (spec section 48): "who is signed in" is read from a cookie
 * set by the clearly-labeled viewer switcher (src/components/demo/ViewerSwitcher), never from a
 * query param treated as real authorization. No password, session token, or real login exists —
 * this must be replaced before any real user data is involved.
 */
export const DEMO_VIEWER_COOKIE = "demo-viewer";

export class MockAuthAdapter implements AuthAdapter {
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const store = await cookies();
    const key = store.get(DEMO_VIEWER_COOKIE)?.value;
    if (!key) return null;
    return DEMO_USERS[key] ?? null;
  }

  async requireUser(): Promise<AuthenticatedUser> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    return user;
  }

  async requireRole(role: UserRole): Promise<AuthenticatedUser> {
    const user = await this.requireUser();
    if (user.role !== role && user.role !== "admin") {
      throw new Error(`This action requires the "${role}" role.`);
    }
    return user;
  }
}

export const authAdapter = new MockAuthAdapter();

import { cookies } from "next/headers";
import { DEMO_USERS } from "@/data/demo-users";
import { getSupabaseSessionUser } from "@/lib/supabase/server-client";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { toBusinessId } from "@/utils/business-id";
import type { AuthenticatedUser, UserRole } from "@/types/auth";
import type { AuthAdapter } from "./auth-adapter";

/**
 * Demo-only stand-in for real auth (spec section 48): "who is signed in" is read from a cookie
 * set by the clearly-labeled viewer switcher (src/components/demo/ViewerSwitcher), never from a
 * query param treated as real authorization. No password, session token, or real login exists
 * for this path — it must never be treated as authorization for anything involving real data.
 */
export const DEMO_VIEWER_COOKIE = "demo-viewer";

async function resolveRealBusinessOwner(): Promise<AuthenticatedUser | null> {
  const sessionUser = await getSupabaseSessionUser();
  if (!sessionUser) return null;

  let ownedBusinessIds: string[] = [];
  if (isSupabaseAdminConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("business_registrations").select("id").eq("owner_id", sessionUser.id);
    ownedBusinessIds = (data ?? []).map((row) => toBusinessId(row.id));
  }

  return { id: sessionUser.id, name: sessionUser.email, role: "business-owner", ownedBusinessIds };
}

/**
 * Checks for a real, Supabase Auth-verified business-owner session first — this is the actual
 * production path once an owner has signed in via /business/owner/login's magic link. Only when
 * no real session exists does this fall back to the mock demo-viewer cookie, so every page that
 * already consumes `authAdapter` (dashboard, trial, business-profile preview) transparently works
 * for real owners without needing its own copy of this logic (spec section 3: "extend the
 * existing architecture, don't duplicate it").
 */
export class MockAuthAdapter implements AuthAdapter {
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const realOwner = await resolveRealBusinessOwner();
    if (realOwner) return realOwner;

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

/**
 * Lets pages hide the demo-only ViewerSwitcher for a real, signed-in Supabase Auth business
 * owner — the switcher's option list is hardcoded to mock owner ids (owner-1, owner-3, ...) and
 * would silently no-op for a real UUID viewer id, which would be confusing to show at all.
 */
export async function isRealBusinessOwnerSession(): Promise<boolean> {
  const sessionUser = await getSupabaseSessionUser();
  return sessionUser !== null;
}

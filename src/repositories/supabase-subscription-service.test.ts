import { describe, expect, it, vi } from "vitest";

// Mirrors src/app/business/register/actions.test.ts's approach: "server-only" is stubbed since
// this module is imported outside a real Next.js server bundle. Every test here relies on
// isSupabaseAdminConfigured() being false in this environment (no SUPABASE_SERVICE_ROLE_KEY /
// NEXT_PUBLIC_SUPABASE_URL set for `vitest run`, unlike `next dev`/`next build`, which load
// .env.local) — that's exactly the "fails closed when unconfigured" behavior under test, not an
// incidental side effect. The success paths (a real insert, a real 23505 collision) need a live
// Supabase connection and are covered by manual/browser verification instead, matching how the
// rest of this codebase tests Supabase-backed code.
vi.mock("server-only", () => ({}));

const { checkRealTrialEligibility, getRealSubscriptionByBusinessId, startRealBusinessTrial, expireDueRealTrials } = await import(
  "./supabase-subscription-service"
);

describe("supabase-subscription-service — fails closed when Supabase admin access isn't configured", () => {
  it("getRealSubscriptionByBusinessId returns null instead of throwing", async () => {
    const result = await getRealSubscriptionByBusinessId("reg-00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("checkRealTrialEligibility refuses rather than granting a trial", async () => {
    const result = await checkRealTrialEligibility("reg-00000000-0000-0000-0000-000000000000", "owner-1");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("business-not-found");
  });

  it("startRealBusinessTrial never reports success", async () => {
    const result = await startRealBusinessTrial("reg-00000000-0000-0000-0000-000000000000", "owner-1");
    expect(result.success).toBe(false);
  });

  it("expireDueRealTrials returns 0 instead of throwing", async () => {
    const count = await expireDueRealTrials();
    expect(count).toBe(0);
  });
});

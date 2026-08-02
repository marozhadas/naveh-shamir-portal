import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AuthenticatedUser } from "@/types/auth";

// server-only is stubbed the same way src/app/business/register/actions.test.ts does.
vi.mock("server-only", () => ({}));

// authAdapter.getCurrentUser() checks a real Supabase Auth session first (via next/headers +
// @supabase/ssr), which only works inside a real Next.js request — mocked here at the module
// boundary so these tests can drive every branch of startTrialAction deterministically, the same
// way a caller of the adapter interface would, without needing a live request context.
const getCurrentUser = vi.fn<() => Promise<AuthenticatedUser | null>>();
vi.mock("@/adapters/mock-auth-adapter", () => ({ authAdapter: { getCurrentUser } }));

// Next's real redirect() aborts execution by throwing a special signal — mocked to do the same
// here (rather than a plain no-op) so the action under test can't accidentally fall through past
// it and return a value real callers would never see.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { startTrialAction } = await import("./actions");
const { subscriptionRepository } = await import("@/repositories/mock-subscription-repository");

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { id: "owner-2", name: "owner-2", role: "business-owner", ownedBusinessIds: ["d2"], ...overrides };
}

function makeFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("startTrialAction", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    redirectMock.mockReset();
  });

  it("blocks when nobody is signed in", async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await startTrialAction({ error: null }, makeFormData({ consent: "on" }));
    expect(result.error).toMatch(/להתחבר/);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("blocks when the consent checkbox wasn't checked, even for an eligible owner", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    const result = await startTrialAction({ error: null }, makeFormData({}));
    expect(result.error).toMatch(/לאשר/);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("blocks when the signed-in account has no associated business", async () => {
    getCurrentUser.mockResolvedValue(makeUser({ ownedBusinessIds: [] }));
    const result = await startTrialAction({ error: null }, makeFormData({ consent: "on" }));
    expect(result.error).toMatch(/לא נמצא עסק/);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("blocks a second trial for a business with an already-active subscription", async () => {
    getCurrentUser.mockResolvedValue(makeUser({ id: "owner-1", ownedBusinessIds: ["d1"] }));
    const result = await startTrialAction({ error: null }, makeFormData({ consent: "on" }));
    expect(result.error).toMatch(/מנוי פעיל/);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("blocks a business whose trial was already used", async () => {
    getCurrentUser.mockResolvedValue(makeUser({ id: "owner-15", ownedBusinessIds: ["d15"] }));
    const result = await startTrialAction({ error: null }, makeFormData({ consent: "on" }));
    expect(result.error).toMatch(/כבר נוצלה/);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("starts a trial for an eligible owner, redirects to the dashboard, and refuses a repeat submission for the same business", async () => {
    // d2/owner-2 is the one seeded demo business with no subscription yet (see mock-subscription-repository.ts's buildSeed doc comment).
    getCurrentUser.mockResolvedValue(makeUser({ id: "owner-2", ownedBusinessIds: ["d2"] }));

    await expect(startTrialAction({ error: null }, makeFormData({ consent: "on" }))).rejects.toThrow("REDIRECT:/business/dashboard");
    const subscription = await subscriptionRepository.getByBusinessId("d2");
    expect(subscription?.status).toBe("trialing");

    const result = await startTrialAction({ error: null }, makeFormData({ consent: "on" }));
    expect(result.error).toMatch(/מנוי פעיל/);
  });
});

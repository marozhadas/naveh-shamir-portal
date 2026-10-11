import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const REGISTRATION_ID = "55555555-5555-5555-5555-555555555555";
const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";

const sessionUser = vi.fn();
vi.mock("@/lib/supabase/server-client", () => ({ getSupabaseSessionUser: () => sessionUser() }));
vi.mock("@/adapters/mock-auth-adapter", () => ({ authAdapter: { getCurrentUser: async () => null } }));
vi.mock("@/lib/payme/config", () => ({ isPayMeConfigured: () => true }));
vi.mock("@/lib/payme/flow-access", () => ({ getPayMeConfigForBusiness: async () => null }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => true }));

const complete = vi.fn();
vi.mock("@/repositories/supabase-subscription-service", () => ({
  savePaymentMethodForRegistration: (...args: unknown[]) => complete(...args),
  startRealBusinessTrialWithPaymentMethod: vi.fn(),
  cancelOwnedPayMeSubscription: vi.fn(),
}));

describe("savePaymentMethodForRegistrationAction (step 6 of the registration: tokenization only)", () => {
  beforeEach(() => {
    sessionUser.mockReset();
    complete.mockReset();
    sessionUser.mockResolvedValue({ id: "user-1", email: "owner@example.com" });
    complete.mockResolvedValue({ success: true });
  });

  async function run(input: Record<string, unknown>) {
    const { savePaymentMethodForRegistrationAction } = await import("./payment-actions");
    return savePaymentMethodForRegistrationAction(input as never);
  }

  it("requires a real signed-in owner", async () => {
    sessionUser.mockResolvedValue(null);
    expect((await run({ registrationId: REGISTRATION_ID, token: TOKEN, consent: true })).status).toBe("error");
    expect(complete).not.toHaveBeenCalled();
  });

  it("requires the consent, a uuid registration id and a well-formed token", async () => {
    expect((await run({ registrationId: REGISTRATION_ID, token: TOKEN, consent: false })).status).toBe("error");
    expect((await run({ registrationId: "not-a-uuid", token: TOKEN, consent: true })).status).toBe("error");
    expect((await run({ registrationId: REGISTRATION_ID, token: "short", consent: true })).status).toBe("error");
    expect(complete).not.toHaveBeenCalled();
  });

  it("passes only the verified session identity, the token and the card mask to the service - and returns nothing but a status", async () => {
    const result = await run({ registrationId: REGISTRATION_ID, token: TOKEN, cardMask: "411111******1111", consent: true });
    expect(result).toEqual({ status: "success" });
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(complete).toHaveBeenCalledWith(REGISTRATION_ID, "user-1", "owner@example.com", TOKEN, "411111******1111");
  });

  it("a client cannot forge the price, trial days, offer, start date, plan or status", async () => {
    await run({
      registrationId: REGISTRATION_ID,
      token: TOKEN,
      cardMask: null,
      consent: true,
      price: 1,
      total: 1,
      trialDays: 3650,
      sub_start_date: "01/01/2020",
      offerCode: "pilot_2026",
      planId: "premium",
      status: "approved",
      ownerId: "someone-else",
    });
    expect(complete.mock.calls[0]).toEqual([REGISTRATION_ID, "user-1", "owner@example.com", TOKEN, null]);
  });

  it("reports a failure without saying anything was charged, and a not-eligible business with the registration wording", async () => {
    complete.mockResolvedValue({ success: false, reason: "payme-rejected" });
    const rejected = await run({ registrationId: REGISTRATION_ID, token: TOKEN, consent: true });
    expect(rejected.status).toBe("error");
    expect(rejected.message).toContain("לא בוצע חיוב");

    complete.mockResolvedValue({ success: false, reason: "not-eligible" });
    const notEligible = await run({ registrationId: REGISTRATION_ID, token: TOKEN, consent: true });
    expect(notEligible.message).not.toContain("נדרש אישור הצוות");
  });
});

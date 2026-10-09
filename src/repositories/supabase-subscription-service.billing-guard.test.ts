import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const BUSINESS_ID = "reg-55555555-5555-5555-5555-555555555555";
const flowConfig = vi.fn();
vi.mock("@/lib/payme/flow-access", () => ({ getPayMeConfigForBusiness: (...args: unknown[]) => flowConfig(...args) }));

const generateSubscription = vi.fn();
const cancelSubscription = vi.fn();
vi.mock("@/lib/payme/client", () => ({
  generatePayMeSubscription: (...args: unknown[]) => generateSubscription(...args),
  cancelPayMeSubscription: (...args: unknown[]) => cancelSubscription(...args),
  parsePayMeDateTime: () => null,
}));

const adminFrom = vi.fn();
vi.mock("@/lib/supabase/admin-client", () => ({
  isSupabaseAdminConfigured: () => true,
  createAdminSupabaseClient: () => ({ from: (...args: unknown[]) => adminFrom(...args) }),
}));

describe("PayMe flow guard in the subscription service", () => {
  beforeEach(() => {
    flowConfig.mockReset();
    generateSubscription.mockReset();
    cancelSubscription.mockReset();
    adminFrom.mockReset();
  });

  it("startRealBusinessTrialWithPaymentMethod: not allowed → nothing is read, saved or sent to PayMe", async () => {
    flowConfig.mockResolvedValue(null);
    const { startRealBusinessTrialWithPaymentMethod } = await import("./supabase-subscription-service");
    const result = await startRealBusinessTrialWithPaymentMethod(BUSINESS_ID, "user-1", "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP", null);
    expect(result).toEqual({ success: false, reason: "payme-not-configured" });
    expect(generateSubscription).not.toHaveBeenCalled();
    expect(adminFrom).not.toHaveBeenCalled(); // no payment token stored, no subscription row
    expect(flowConfig).toHaveBeenCalledWith(BUSINESS_ID);
  });

  it("startRealBusinessTrial (card-less): closed only for a business PayMe is open for", async () => {
    flowConfig.mockResolvedValue({ env: "sandbox", baseUrl: "https://sandbox.payme.io/api" });
    const { startRealBusinessTrial } = await import("./supabase-subscription-service");
    expect(await startRealBusinessTrial(BUSINESS_ID, "user-1")).toEqual({ success: false, reason: "payment-method-required" });
    expect(adminFrom).not.toHaveBeenCalled();
  });

  it("startRealBusinessTrial (card-less): stays open for a business the sandbox switch is off for", async () => {
    flowConfig.mockResolvedValue(null);
    // The service goes on to the normal eligibility checks (which hit the database); make them stop right there.
    adminFrom.mockImplementation(() => {
      throw new Error("stop-after-guard");
    });
    const { startRealBusinessTrial } = await import("./supabase-subscription-service");
    await expect(startRealBusinessTrial(BUSINESS_ID, "user-1")).rejects.toThrow("stop-after-guard");
    expect(adminFrom).toHaveBeenCalled();
  });
});

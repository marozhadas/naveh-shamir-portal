import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const BUSINESS_ID = "reg-44444444-4444-4444-4444-444444444444";
const getUser = vi.fn();
vi.mock("@/adapters/mock-auth-adapter", () => ({ authAdapter: { getCurrentUser: () => getUser() } }));

const flowConfig = vi.fn();
vi.mock("@/lib/payme/flow-access", () => ({ getPayMeConfigForBusiness: (...args: unknown[]) => flowConfig(...args) }));
vi.mock("@/lib/payme/config", () => ({ isPayMeConfigured: () => true }));

const startWithPaymentMethod = vi.fn();
vi.mock("@/repositories/supabase-subscription-service", () => ({
  startRealBusinessTrialWithPaymentMethod: (...args: unknown[]) => startWithPaymentMethod(...args),
  cancelOwnedPayMeSubscription: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => true }));

const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";

describe("activateTrialWithPaymentMethodAction — sandbox guard", () => {
  beforeEach(() => {
    getUser.mockReset();
    flowConfig.mockReset();
    startWithPaymentMethod.mockReset();
    getUser.mockResolvedValue({ id: "user-1", ownedBusinessIds: [BUSINESS_ID] });
  });

  it("refuses — and never reaches the PayMe flow — when the business is not allowed (sandbox, switch off)", async () => {
    flowConfig.mockResolvedValue(null);
    const { activateTrialWithPaymentMethodAction } = await import("./payment-actions");
    const result = await activateTrialWithPaymentMethodAction({ token: TOKEN, cardMask: "411111******1111", consent: true });
    expect(result.status).toBe("error");
    expect(startWithPaymentMethod).not.toHaveBeenCalled();
    // the decision is made for the SESSION's business, never for an id the client supplied
    expect(flowConfig).toHaveBeenCalledWith(BUSINESS_ID);
  });

  it("goes on to the service when the business is allowed", async () => {
    flowConfig.mockResolvedValue({ env: "sandbox" });
    startWithPaymentMethod.mockResolvedValue({ success: true });
    const { activateTrialWithPaymentMethodAction } = await import("./payment-actions");
    const result = await activateTrialWithPaymentMethodAction({ token: TOKEN, cardMask: null, consent: true });
    expect(result.status).toBe("success");
    expect(startWithPaymentMethod).toHaveBeenCalledWith(BUSINESS_ID, "user-1", TOKEN, null);
  });

  it("a client cannot pick the business: extra fields in the input are ignored", async () => {
    flowConfig.mockResolvedValue(null);
    const { activateTrialWithPaymentMethodAction } = await import("./payment-actions");
    await activateTrialWithPaymentMethodAction({ token: TOKEN, consent: true, businessId: "reg-99999999-9999-9999-9999-999999999999", billing_test_enabled: true } as never);
    expect(flowConfig).toHaveBeenCalledTimes(1);
    expect(flowConfig).toHaveBeenCalledWith(BUSINESS_ID);
  });
});

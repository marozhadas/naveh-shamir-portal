import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentUser = vi.fn();
vi.mock("@/adapters/mock-auth-adapter", () => ({ authAdapter: { getCurrentUser: (...args: unknown[]) => getCurrentUser(...args) } }));
const getSupabaseSessionUser = vi.fn();
vi.mock("@/lib/supabase/server-client", () => ({ getSupabaseSessionUser: (...args: unknown[]) => getSupabaseSessionUser(...args) }));
const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: (...args: unknown[]) => checkRateLimit(...args) }));

const startTrial = vi.fn();
const saveMethod = vi.fn();
const cancelOwned = vi.fn();
vi.mock("@/repositories/supabase-subscription-service", () => ({
  startRealBusinessTrialWithPaymentMethod: (...args: unknown[]) => startTrial(...args),
  savePaymentMethodForRegistration: (...args: unknown[]) => saveMethod(...args),
  cancelOwnedPayMeSubscription: (...args: unknown[]) => cancelOwned(...args),
}));

// NOTE: no mock of lib/payme/dormant - this is the real, dormant behaviour with a COMPLETE PayMe configuration present.
import { activateTrialWithPaymentMethodAction, cancelPayMeSubscriptionAction, savePaymentMethodForRegistrationAction } from "./payment-actions";

const KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET", "PAYME_SANDBOX_TEST_EMAILS", "PAYMENTS_PROVIDER"] as const;
const fetchMock = vi.fn();

function fullPayMeEnv(env: "sandbox" | "live") {
  process.env.PAYME_ENV = env;
  process.env.PAYME_SELLER_ID = "MPL-TEST-SELLER-789";
  process.env.PAYME_HOSTED_FIELDS_KEY = "public-key-for-browser-456";
  process.env.PAYME_WEBHOOK_SECRET = "w".repeat(40);
  process.env.PAYME_SANDBOX_TEST_EMAILS = "noa@example.com";
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of KEYS) delete process.env[key];
  for (const mock of [getCurrentUser, getSupabaseSessionUser, checkRateLimit, startTrial, saveMethod, cancelOwned, fetchMock]) mock.mockReset();
});

describe("the owner-facing payment actions while PayMe is dormant (a full PayMe configuration present)", () => {
  for (const env of ["sandbox", "live"] as const) {
    it(`PAYME_ENV=${env}: every action answers payments_temporarily_unavailable and touches nothing`, async () => {
      fullPayMeEnv(env);
      vi.stubGlobal("fetch", fetchMock);

      const activate = await activateTrialWithPaymentMethodAction({ token: "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP", cardMask: "411111******1111", consent: true });
      const save = await savePaymentMethodForRegistrationAction({ registrationId: "55555555-5555-5555-5555-555555555555", token: "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP", cardMask: null, consent: true });
      const cancel = await cancelPayMeSubscriptionAction();

      for (const result of [activate, save, cancel]) {
        expect(result).toMatchObject({ status: "error", code: "payments_temporarily_unavailable" });
        expect(result.message).toContain("לא בוצע חיוב");
      }
      // no session was even read, no token was handed to a service, nothing was rate-limited, no network call
      expect(getCurrentUser).not.toHaveBeenCalled();
      expect(getSupabaseSessionUser).not.toHaveBeenCalled();
      expect(checkRateLimit).not.toHaveBeenCalled();
      expect(startTrial).not.toHaveBeenCalled();
      expect(saveMethod).not.toHaveBeenCalled();
      expect(cancelOwned).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }

  it("selecting PAYMENTS_PROVIDER=payme (or sumit) does not bring PayMe back", async () => {
    fullPayMeEnv("live");
    for (const value of ["payme", "sumit"]) {
      process.env.PAYMENTS_PROVIDER = value;
      expect(await activateTrialWithPaymentMethodAction({ token: "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP", consent: true })).toMatchObject({ status: "error", code: "payments_temporarily_unavailable" });
    }
    expect(startTrial).not.toHaveBeenCalled();
  });
});

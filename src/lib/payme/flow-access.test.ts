import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const adminState = { configured: true, flag: false as boolean | null, error: false, queries: 0, lastId: "" };
vi.mock("@/lib/supabase/admin-client", () => ({
  isSupabaseAdminConfigured: () => adminState.configured,
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => {
            adminState.queries += 1;
            adminState.lastId = id;
            if (adminState.error) return { data: null, error: { message: "boom" } };
            return { data: adminState.flag === null ? null : { billing_test_enabled: adminState.flag }, error: null };
          },
        }),
      }),
    }),
  }),
}));

const ENV_KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_SECRET_KEY", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"] as const;
function configure(env: "sandbox" | "live") {
  process.env.PAYME_ENV = env;
  process.env.PAYME_SELLER_ID = "MPL-TEST-SELLER";
  process.env.PAYME_SECRET_KEY = "secret-key-test";
  process.env.PAYME_HOSTED_FIELDS_KEY = "hosted-key-test";
  process.env.PAYME_WEBHOOK_SECRET = "s".repeat(40);
}

describe("decideBillingFlowAccess", () => {
  it("never allows anything while PayMe is not configured", async () => {
    const { decideBillingFlowAccess } = await import("./flow-access");
    expect(decideBillingFlowAccess(null, true)).toEqual({ allowed: false, reason: "not-configured" });
    expect(decideBillingFlowAccess(null, false)).toEqual({ allowed: false, reason: "not-configured" });
  });

  it("sandbox: only a business an admin switched on", async () => {
    const { decideBillingFlowAccess } = await import("./flow-access");
    expect(decideBillingFlowAccess("sandbox", false)).toEqual({ allowed: false, reason: "sandbox-not-enabled" });
    expect(decideBillingFlowAccess("sandbox", true)).toEqual({ allowed: true });
  });

  it("live: the test switch never blocks the normal flow (and never matters)", async () => {
    const { decideBillingFlowAccess } = await import("./flow-access");
    expect(decideBillingFlowAccess("live", false)).toEqual({ allowed: true });
    expect(decideBillingFlowAccess("live", true)).toEqual({ allowed: true });
  });
});

describe("getPayMeConfigForBusiness", () => {
  beforeEach(() => {
    adminState.configured = true;
    adminState.flag = false;
    adminState.error = false;
    adminState.queries = 0;
    adminState.lastId = "";
  });
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("returns null when PayMe is not configured (and does not even query)", async () => {
    const { getPayMeConfigForBusiness } = await import("./flow-access");
    expect(await getPayMeConfigForBusiness("reg-11111111-1111-1111-1111-111111111111")).toBeNull();
    expect(adminState.queries).toBe(0);
  });

  it("sandbox + flag off → null; sandbox + flag on → the config", async () => {
    configure("sandbox");
    const { getPayMeConfigForBusiness } = await import("./flow-access");
    adminState.flag = false;
    expect(await getPayMeConfigForBusiness("reg-11111111-1111-1111-1111-111111111111")).toBeNull();
    adminState.flag = true;
    const config = await getPayMeConfigForBusiness("reg-11111111-1111-1111-1111-111111111111");
    expect(config?.env).toBe("sandbox");
    // the lookup is by the plain registration id (reg- prefix stripped)
    expect(adminState.lastId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("sandbox fails CLOSED on any doubt: query error, missing row, no admin access", async () => {
    configure("sandbox");
    const { getPayMeConfigForBusiness } = await import("./flow-access");
    adminState.flag = true;
    adminState.error = true;
    expect(await getPayMeConfigForBusiness("reg-22222222-2222-2222-2222-222222222222")).toBeNull();
    adminState.error = false;
    adminState.flag = null;
    expect(await getPayMeConfigForBusiness("reg-22222222-2222-2222-2222-222222222222")).toBeNull();
    adminState.flag = true;
    adminState.configured = false;
    expect(await getPayMeConfigForBusiness("reg-22222222-2222-2222-2222-222222222222")).toBeNull();
  });

  it("live returns the config for everyone, regardless of the flag, without a lookup", async () => {
    configure("live");
    const { getPayMeConfigForBusiness } = await import("./flow-access");
    adminState.flag = false;
    expect((await getPayMeConfigForBusiness("reg-33333333-3333-3333-3333-333333333333"))?.env).toBe("live");
    expect(adminState.queries).toBe(0);
  });
});

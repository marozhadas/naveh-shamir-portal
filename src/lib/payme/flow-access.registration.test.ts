import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// LEGACY: PayMe is dormant (see lib/payme/dormant.ts). This file tests the dormant code as if it were enabled, so it stays covered for rollback/debug.
vi.mock("@/lib/payme/dormant", () => ({ isPayMeProviderActive: () => true }));
vi.mock("@/lib/supabase/admin-client", () => ({ isSupabaseAdminConfigured: () => false, createAdminSupabaseClient: () => ({}) }));

const ENV_KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET", "PAYME_SANDBOX_TEST_EMAILS"] as const;
function configure(env: "sandbox" | "live", testEmails?: string) {
  process.env.PAYME_ENV = env;
  process.env.PAYME_SELLER_ID = "MPL-TEST-SELLER";
  process.env.PAYME_HOSTED_FIELDS_KEY = "hosted-key-test";
  process.env.PAYME_WEBHOOK_SECRET = "s".repeat(40);
  if (testEmails !== undefined) process.env.PAYME_SANDBOX_TEST_EMAILS = testEmails;
  else delete process.env.PAYME_SANDBOX_TEST_EMAILS;
}

describe("registration payment step - who may see it", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("parses the sandbox test-email list (trimmed, lower-cased, junk ignored)", async () => {
    const { parseSandboxTestEmails } = await import("./flow-access");
    expect(parseSandboxTestEmails(" Test@Example.com , other@example.com,,notanemail , ")).toEqual(["test@example.com", "other@example.com"]);
    expect(parseSandboxTestEmails(undefined)).toEqual([]);
    expect(parseSandboxTestEmails("")).toEqual([]);
  });

  it("not configured: nobody", async () => {
    const { decideRegistrationPaymentAccess } = await import("./flow-access");
    expect(decideRegistrationPaymentAccess(null, "a@b.co", ["a@b.co"])).toEqual({ allowed: false, reason: "not-configured" });
  });

  it("live: every registrant", async () => {
    const { decideRegistrationPaymentAccess } = await import("./flow-access");
    expect(decideRegistrationPaymentAccess("live", "anyone@example.com", [])).toEqual({ allowed: true });
    expect(decideRegistrationPaymentAccess("live", null, [])).toEqual({ allowed: true });
  });

  it("sandbox: only an email on the list - a real owner never meets the test form", async () => {
    const { decideRegistrationPaymentAccess } = await import("./flow-access");
    expect(decideRegistrationPaymentAccess("sandbox", "Tester@Example.com", ["tester@example.com"])).toEqual({ allowed: true });
    expect(decideRegistrationPaymentAccess("sandbox", "real-owner@example.com", ["tester@example.com"])).toEqual({ allowed: false, reason: "sandbox-not-enabled" });
    expect(decideRegistrationPaymentAccess("sandbox", null, ["tester@example.com"])).toEqual({ allowed: false, reason: "sandbox-not-enabled" });
    expect(decideRegistrationPaymentAccess("sandbox", "tester@example.com", [])).toEqual({ allowed: false, reason: "sandbox-not-enabled" });
  });

  it("getPayMeConfigForRegistrant reads the list from the server environment", async () => {
    const { getPayMeConfigForRegistrant } = await import("./flow-access");
    configure("sandbox", "tester@example.com");
    expect(await getPayMeConfigForRegistrant("tester@example.com")).not.toBeNull();
    expect(await getPayMeConfigForRegistrant("real-owner@example.com")).toBeNull();
    configure("sandbox");
    expect(await getPayMeConfigForRegistrant("tester@example.com")).toBeNull();
    configure("live");
    expect(await getPayMeConfigForRegistrant("real-owner@example.com")).not.toBeNull();
    for (const key of ENV_KEYS) delete process.env[key];
    expect(await getPayMeConfigForRegistrant("real-owner@example.com")).toBeNull();
  });

  it("the optional list is not one of the four required PayMe variables", async () => {
    const { PAYME_ENV_VARIABLE_NAMES } = await import("./config");
    expect([...PAYME_ENV_VARIABLE_NAMES]).not.toContain("PAYME_SANDBOX_TEST_EMAILS");
  });
});

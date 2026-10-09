import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_SECRET_KEY", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"] as const;

function setAll(overrides: Partial<Record<(typeof KEYS)[number], string>> = {}) {
  const base = { PAYME_ENV: "sandbox", PAYME_SELLER_ID: "MPL-X", PAYME_SECRET_KEY: "sk", PAYME_HOSTED_FIELDS_KEY: "hk", PAYME_WEBHOOK_SECRET: "w".repeat(32) };
  for (const [key, value] of Object.entries({ ...base, ...overrides })) process.env[key] = value;
}

describe("PayMe config", () => {
  afterEach(() => {
    for (const key of KEYS) delete process.env[key];
  });

  it("is OFF until every variable is present and valid", async () => {
    const { getPayMeConfig, isPayMeConfigured, getMissingPayMeVariables } = await import("./config");
    expect(isPayMeConfigured()).toBe(false);
    expect(getMissingPayMeVariables()).toEqual(["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_SECRET_KEY", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"]);
    setAll();
    expect(isPayMeConfigured()).toBe(true);
    expect(getPayMeConfig()?.baseUrl).toBe("https://sandbox.payme.io/api");
  });

  it("selects the live API for PAYME_ENV=live and rejects unknown environments", async () => {
    const { getPayMeConfig } = await import("./config");
    setAll({ PAYME_ENV: "live" });
    expect(getPayMeConfig()?.baseUrl).toBe("https://live.payme.io/api");
    setAll({ PAYME_ENV: "production" });
    expect(getPayMeConfig()).toBeNull();
  });

  it("refuses a short webhook secret", async () => {
    const { getPayMeConfig, getMissingPayMeVariables } = await import("./config");
    setAll({ PAYME_WEBHOOK_SECRET: "short" });
    expect(getPayMeConfig()).toBeNull();
    expect(getMissingPayMeVariables()).toEqual(["PAYME_WEBHOOK_SECRET"]);
  });

  it("builds the callback URL with the secret as the last path segment", async () => {
    const { buildPayMeCallbackUrl } = await import("./config");
    expect(buildPayMeCallbackUrl("https://site.example/", "abc def")).toBe("https://site.example/api/webhooks/payme/abc%20def");
  });
});

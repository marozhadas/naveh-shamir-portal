import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

const REGISTRATION_ID = "55555555-5555-5555-5555-555555555555";
const TOKEN = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const EMAIL = "owner@example.com";
const PAYER = { firstName: "נועה", lastName: "לוי", email: EMAIL, phone: "054-521-8644" };

const sessionUser = vi.fn();
vi.mock("@/lib/supabase/server-client", () => ({ getSupabaseSessionUser: () => sessionUser() }));
const rateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: (...args: unknown[]) => rateLimit(...args) }));
const save = vi.fn();
const savedStatus = vi.fn();
vi.mock("@/repositories/sumit-payment-method-service", () => ({ saveSumitPaymentMethodForRegistration: (...args: unknown[]) => save(...args), getCardSavedStatusForRegistration: (...args: unknown[]) => savedStatus(...args) }));

const ENV = ["PAYMENTS_PROVIDER", "SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_TEST_EMAILS", "SUMIT_DRY_RUN"] as const;

beforeEach(() => {
  sessionUser.mockReset();
  save.mockReset();
  savedStatus.mockReset();
  savedStatus.mockResolvedValue({ status: "not-saved" });
  rateLimit.mockReset();
  sessionUser.mockResolvedValue({ id: "user-1", email: EMAIL });
  rateLimit.mockResolvedValue(true);
  save.mockResolvedValue({ success: true });
  process.env.PAYMENTS_PROVIDER = "sumit";
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456";
  process.env.SUMIT_TEST_EMAILS = EMAIL;
});
afterEach(() => {
  for (const key of ENV) delete process.env[key];
});

async function run(input: unknown) {
  const { saveSumitPaymentMethodForRegistrationAction } = await import("./sumit-payment-actions");
  return saveSumitPaymentMethodForRegistrationAction(input as never);
}
const valid = (overrides: Record<string, unknown> = {}) => ({ registrationId: REGISTRATION_ID, token: TOKEN, payer: { ...PAYER }, consent: true, ...overrides });

describe("saveSumitPaymentMethodForRegistrationAction (step 6: save a card, nothing else)", () => {
  it("passes ONLY the verified session identity, the registration pointer, the payer and the token to the service", async () => {
    expect(await run(valid())).toEqual({ status: "success" });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      registrationId: REGISTRATION_ID,
      ownerId: "user-1",
      registrantEmail: EMAIL,
      payer: { name: "נועה לוי", email: EMAIL, phone: "0545218644" },
      singleUseToken: TOKEN,
    });
  });

  it("requires a signed-in owner, and a listed test email on the test organization", async () => {
    sessionUser.mockResolvedValue(null);
    expect((await run(valid())).status).toBe("error");
    sessionUser.mockResolvedValue({ id: "user-2", email: "stranger@example.com" });
    expect(await run(valid())).toMatchObject({ status: "error", code: "payments_temporarily_unavailable" });
    expect(save).not.toHaveBeenCalled();
  });

  it("is limited to SUMIT_TEST_EMAILS and the test organization ALSO with SUMIT_DRY_RUN=false; off with PAYMENTS_PROVIDER not sumit", async () => {
    process.env.SUMIT_DRY_RUN = "false";
    sessionUser.mockResolvedValue({ id: "user-2", email: "stranger@example.com" });
    expect((await run(valid())).status).toBe("error");
    process.env.SUMIT_TEST_EMAILS = "";
    sessionUser.mockResolvedValue({ id: "user-1", email: EMAIL });
    expect((await run(valid())).status).toBe("error");
    process.env.SUMIT_TEST_EMAILS = EMAIL;
    process.env.PAYMENTS_PROVIDER = "payme";
    expect((await run(valid())).status).toBe("error");
    expect(save).not.toHaveBeenCalled();
  });

  it("requires the consent, a uuid registration id and a well-formed token", async () => {
    expect((await run(valid({ consent: false }))).status).toBe("error");
    expect((await run(valid({ consent: "true" }))).status).toBe("error");
    expect((await run(valid({ registrationId: "not-a-uuid" }))).status).toBe("error");
    for (const token of ["short", "has spaces in it!!", "", 42, null]) expect((await run(valid({ token }))).status, String(token)).toBe("error");
    expect(save).not.toHaveBeenCalled();
  });

  it("REFUSES anything that could carry card data: extra properties anywhere, or a token that is a card number", async () => {
    for (const extra of [{ cardNumber: "4580458045804580" }, { cvv: "123" }, { expiry: "05/31" }, { citizenId: "123456789" }, { cardMask: "4580********4580" }, { card: { number: "4580458045804580" } }]) {
      expect((await run(valid(extra))).status, JSON.stringify(Object.keys(extra))).toBe("error");
    }
    expect((await run(valid({ payer: { ...PAYER, cardNumber: "4580458045804580" } }))).status).toBe("error");
    expect((await run(valid({ payer: { ...PAYER, cvv: "123" } }))).status).toBe("error");
    for (const token of ["4580458045804580", "4580 4580 4580 4580", "4580-4580-4580-4580", "458045804580458"]) expect((await run(valid({ token }))).status, token).toBe("error");
    expect(save).not.toHaveBeenCalled();
  });

  it("an error never echoes the token or anything typed", async () => {
    const result = await run(valid({ cvv: "123", token: "4580458045804580" }));
    expect(JSON.stringify(result)).not.toMatch(/4580|123|cvv/i);
  });

  it("validates the payer on the server (name, email, Israeli phone) - the browser check is not trusted", async () => {
    for (const payer of [{ ...PAYER, firstName: " " }, { ...PAYER, lastName: "" }, { ...PAYER, email: "not-an-email" }, { ...PAYER, phone: "123" }, { ...PAYER, phone: 5452186440 }]) {
      expect((await run(valid({ payer }))).status, JSON.stringify(payer)).toBe("error");
    }
    expect((await run(valid({ payer: null }))).status).toBe("error");
    expect(save).not.toHaveBeenCalled();
  });

  it("is rate limited per signed-in user, before anything is sent to SUMIT", async () => {
    rateLimit.mockResolvedValue(false);
    expect((await run(valid())).status).toBe("error");
    expect(rateLimit).toHaveBeenCalledWith("payment-method:user-1", 8, 3600);
    expect(save).not.toHaveBeenCalled();
  });

  it("maps every service failure to a Hebrew message that says nothing was charged, and never leaks the reason code or the token", async () => {
    for (const reason of ["sumit-not-configured", "invalid-input", "not-eligible", "already-exists", "invalid-plan", "rejected", "provider-error", "unknown-error"]) {
      save.mockResolvedValue({ success: false, reason });
      const result = await run(valid());
      expect(result.status, reason).toBe("error");
      expect(result.message, reason).toMatch(/[א-ת]/);
      expect(JSON.stringify(result), reason).not.toContain(TOKEN);
      expect(result.message, reason).not.toContain(reason);
    }
  });
});

describe("getSumitCardSavedStatusAction (read only: has the card of this registration been saved?)", () => {
  async function status(input: unknown) {
    const { getSumitCardSavedStatusAction } = await import("./sumit-payment-actions");
    return getSumitCardSavedStatusAction(input as never);
  }

  it("asks the service with the verified session user and the registration id, and returns ONLY a status", async () => {
    savedStatus.mockResolvedValue({ status: "saved" });
    expect(await status({ registrationId: REGISTRATION_ID })).toEqual({ status: "saved" });
    expect(savedStatus).toHaveBeenCalledWith({ registrationId: REGISTRATION_ID, ownerId: "user-1" });
    savedStatus.mockResolvedValue({ status: "not-saved" });
    expect(await status({ registrationId: REGISTRATION_ID })).toEqual({ status: "not-saved" });
  });

  it("never starts a save", async () => {
    savedStatus.mockResolvedValue({ status: "saved" });
    await status({ registrationId: REGISTRATION_ID });
    expect(save).not.toHaveBeenCalled();
  });

  it("not signed in, not on the SUMIT test list, a bad id or extra properties: 'error' and nothing is read", async () => {
    sessionUser.mockResolvedValue(null);
    expect(await status({ registrationId: REGISTRATION_ID })).toEqual({ status: "error" });
    sessionUser.mockResolvedValue({ id: "user-2", email: "stranger@example.com" });
    expect(await status({ registrationId: REGISTRATION_ID })).toEqual({ status: "error" });
    sessionUser.mockResolvedValue({ id: "user-1", email: EMAIL });
    expect(await status({ registrationId: "not-a-uuid" })).toEqual({ status: "error" });
    expect(await status({ registrationId: REGISTRATION_ID, cardNumber: "4580458045804580" })).toEqual({ status: "error" });
    expect(await status(null)).toEqual({ status: "error" });
    expect(savedStatus).not.toHaveBeenCalled();
  });
});

describe("static guard rails of the action", () => {
  const source = readFileSync(path.resolve(__dirname, "sumit-payment-actions.ts"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("has no console call (the token passes through it), no charge and no subscription call, and does not import the PayMe action module", () => {
    expect(code).not.toMatch(/console\./);
    expect(code).not.toMatch(/\.charge\(|chargeSumit|getPayment|activate|subscription|revalidatePath/i);
    expect(code).not.toMatch(/lib\/payme\/|supabase-subscription-service|\/payment-actions"/);
    expect(code).not.toMatch(/SUMIT_API_KEY|apiKey/);
  });
});

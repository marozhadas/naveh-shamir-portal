import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PaymentProviderError, type PaymentProvider } from "@/domain/payments/payment-provider";

const REGISTRATION_ID = "55555555-5555-5555-5555-555555555555";
const OWNER = "owner-uuid-1";
const EMAIL = "noa@example.com";
const SINGLE_USE_TOKEN = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const PERMANENT_TOKEN = "perm-token-must-never-be-stored";

type Op = { table: string; op: string; payload?: unknown; options?: unknown };
const log: Op[] = [];
const db = {
  registration: null as Record<string, unknown> | null,
  existingSubscription: null as Record<string, unknown> | null,
  upsertError: null as null | { message: string },
  existingCard: null as Record<string, unknown> | null,
  cardReadError: null as null | { message: string },
};

function from(table: string) {
  const filters: Record<string, unknown> = {};
  const q = {
    select() {
      return q;
    },
    eq(column: string, value: unknown) {
      filters[column] = value;
      return q;
    },
    async maybeSingle() {
      if (table === "business_registrations") {
        const row = db.registration;
        if (!row || filters.id !== row.id || filters.owner_id !== row.owner_id) return { data: null, error: null };
        return { data: row, error: null };
      }
      if (table === "business_subscriptions") return { data: db.existingSubscription, error: null };
      if (table === "billing_payment_methods") return { data: db.existingCard, error: db.cardReadError };
      return { data: null, error: null };
    },
    insert(payload: unknown) {
      log.push({ table, op: "insert", payload });
      return Promise.resolve({ error: null });
    },
    upsert(payload: unknown, options: unknown) {
      log.push({ table, op: "upsert", payload, options });
      return Promise.resolve({ error: table === "billing_payment_methods" ? db.upsertError : null });
    },
    update(payload: unknown) {
      log.push({ table, op: "update", payload });
      return { eq: async () => ({ error: null }) };
    },
    delete() {
      log.push({ table, op: "delete" });
      return { eq: async () => ({ error: null }) };
    },
  };
  return q;
}
vi.mock("@/lib/supabase/admin-client", () => ({ isSupabaseAdminConfigured: () => true, createAdminSupabaseClient: () => ({ from }) }));

import { getCardSavedStatusForRegistration, saveSumitPaymentMethodForRegistration } from "./sumit-payment-method-service";

const ENV_KEYS = ["PAYMENTS_PROVIDER", "SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_ALLOW_PRODUCTION", "SUMIT_DRY_RUN", "SUMIT_TEST_EMAILS"] as const;
function configureSumit(overrides: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}) {
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456"; // the approved test organization = the configured one
  process.env.SUMIT_TEST_EMAILS = EMAIL;
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
}

function makeProvider(overrides: Partial<PaymentProvider> = {}) {
  const provider = {
    id: "sumit",
    dryRun: true,
    savePaymentMethod: vi.fn(async () => ({ customerId: "77", paymentMethodId: "5", cardMask: "458045******4580" })),
    getPaymentMethod: vi.fn(),
    removePaymentMethod: vi.fn(async () => undefined),
    charge: vi.fn(),
    getPayment: vi.fn(),
    ...overrides,
  };
  return provider as unknown as PaymentProvider & { savePaymentMethod: ReturnType<typeof vi.fn>; removePaymentMethod: ReturnType<typeof vi.fn>; charge: ReturnType<typeof vi.fn>; getPayment: ReturnType<typeof vi.fn> };
}

const REGISTRATION = { id: REGISTRATION_ID, owner_id: OWNER, status: "pending", plan_tier: "plus", selected_billing_interval: "monthly", offer_code: "launch_standard" };
const input = (overrides: Partial<Parameters<typeof saveSumitPaymentMethodForRegistration>[0]> = {}) => ({
  registrationId: REGISTRATION_ID,
  ownerId: OWNER,
  registrantEmail: EMAIL,
  payer: { name: "Noa Levi", email: EMAIL, phone: "0545218644" },
  singleUseToken: SINGLE_USE_TOKEN,
  ...overrides,
});
const ops = (table: string, op: string) => log.filter((entry) => entry.table === table && entry.op === op);

beforeEach(() => {
  log.length = 0;
  db.registration = { ...REGISTRATION };
  db.existingSubscription = null;
  db.upsertError = null;
  db.existingCard = null;
  db.cardReadError = null;
  configureSumit();
});
afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("saving a SUMIT payment method for a registration (mocks only)", () => {
  it("creates/finds the customer and attaches the card through the provider, with our registration id as the external id", async () => {
    const provider = makeProvider();
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider })).toEqual({ success: true });
    expect(provider.savePaymentMethod).toHaveBeenCalledTimes(1);
    expect(provider.savePaymentMethod).toHaveBeenCalledWith({ externalCustomerId: REGISTRATION_ID, customer: { name: "Noa Levi", email: EMAIL, phone: "0545218644" }, paymentToken: SINGLE_USE_TOKEN });
  });

  it("SAVES the SUMIT row WITHOUT provider_token: customer id, payment-method id and the masked card only", async () => {
    await saveSumitPaymentMethodForRegistration(input(), { provider: makeProvider() });
    const [upsert] = ops("billing_payment_methods", "upsert");
    expect(upsert.options).toEqual({ onConflict: "business_registration_id" });
    expect(upsert.payload).toMatchObject({
      business_registration_id: REGISTRATION_ID,
      owner_id: OWNER,
      provider: "sumit",
      provider_token: null,
      provider_customer_id: "77",
      provider_payment_method_id: "5",
      card_mask: "458045******4580",
    });
    expect(Object.keys(upsert.payload as object).sort()).toEqual(["business_registration_id", "card_mask", "owner_id", "provider", "provider_customer_id", "provider_payment_method_id", "provider_token", "updated_at"]);
    expect((upsert.payload as { provider_token: unknown }).provider_token).toBeNull();
  });

  it("the payment-method id is optional (SUMIT may not report it) - the customer id is not", async () => {
    await saveSumitPaymentMethodForRegistration(input(), { provider: makeProvider({ savePaymentMethod: vi.fn(async () => ({ customerId: "77", paymentMethodId: null, cardMask: null })) }) });
    expect(ops("billing_payment_methods", "upsert")[0].payload).toMatchObject({ provider_customer_id: "77", provider_payment_method_id: null, card_mask: null });
  });

  it("provider_customer_id is MANDATORY: a missing or malformed customer id saves nothing", async () => {
    for (const customerId of ["", "abc", "12 3", "1234567890123456"]) {
      log.length = 0;
      const provider = makeProvider({ savePaymentMethod: vi.fn(async () => ({ customerId, paymentMethodId: "5", cardMask: "458045******4580" })) });
      expect(await saveSumitPaymentMethodForRegistration(input(), { provider }), customerId).toEqual({ success: false, reason: "provider-error" });
      expect(ops("billing_payment_methods", "upsert"), customerId).toEqual([]);
    }
  });

  it("the SingleUseToken is NOT stored: it appears in no database write, no event and no result", async () => {
    // even if the provider (wrongly) handed back more than it should, only the whitelisted fields are written
    const provider = makeProvider({ savePaymentMethod: vi.fn(async () => ({ customerId: "77", paymentMethodId: "5", cardMask: "458045******4580", CreditCard_Token: PERMANENT_TOKEN, CreditCard_Number: "4580458045804580", CVV: "123" }) as never) });
    const result = await saveSumitPaymentMethodForRegistration(input(), { provider });
    const everything = JSON.stringify({ log, result });
    for (const forbidden of [SINGLE_USE_TOKEN, PERMANENT_TOKEN, "4580458045804580", "123456789", "CVV", "CreditCard_", "Expiration", "CitizenID"]) {
      expect(everything, forbidden).not.toContain(forbidden);
    }
    expect(JSON.stringify(ops("business_events_log", "insert")[0].payload)).toBe(JSON.stringify({ business_registration_id: REGISTRATION_ID, event_type: "payment_method_added", actor_id: OWNER, metadata: { provider: "sumit", stage: "registration" } }));
  });

  it("NOTHING is charged and no business flow moves: no charge call, no subscription, no registration update, no approval", async () => {
    const provider = makeProvider();
    await saveSumitPaymentMethodForRegistration(input(), { provider });
    expect(provider.charge).not.toHaveBeenCalled();
    expect(provider.getPayment).not.toHaveBeenCalled();
    expect(log.filter((entry) => entry.table === "business_subscriptions")).toEqual([]);
    expect(log.filter((entry) => entry.table === "business_registrations")).toEqual([]);
    expect(log.filter((entry) => entry.table === "billing_transactions" || entry.table === "billing_events")).toEqual([]);
    expect(log.map((entry) => `${entry.table}:${entry.op}`).sort()).toEqual(["billing_payment_methods:upsert", "business_events_log:insert"]);
  });

  it("saving again replaces the single row of that registration (same conflict key; provider_token is explicitly cleared)", async () => {
    await saveSumitPaymentMethodForRegistration(input(), { provider: makeProvider() });
    await saveSumitPaymentMethodForRegistration(input(), { provider: makeProvider() });
    for (const upsert of ops("billing_payment_methods", "upsert")) {
      expect(upsert.options).toEqual({ onConflict: "business_registration_id" });
      expect((upsert.payload as Record<string, unknown>).provider_token).toBeNull();
    }
  });
});

describe("who may use it, and what must be true first", () => {
  it("off when SUMIT is not configured: the provider is never called", async () => {
    for (const key of ENV_KEYS) delete process.env[key];
    const provider = makeProvider();
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider })).toEqual({ success: false, reason: "sumit-not-configured" });
    expect(provider.savePaymentMethod).not.toHaveBeenCalled();
  });

  it("the experiment: ONLY the listed test emails, ALWAYS - also with SUMIT_DRY_RUN=false", async () => {
    const provider = makeProvider();
    expect(await saveSumitPaymentMethodForRegistration(input({ registrantEmail: "stranger@example.com" }), { provider })).toEqual({ success: false, reason: "sumit-not-configured" });
    expect(await saveSumitPaymentMethodForRegistration(input({ registrantEmail: null }), { provider })).toEqual({ success: false, reason: "sumit-not-configured" });
    expect(provider.savePaymentMethod).not.toHaveBeenCalled();
    expect(await saveSumitPaymentMethodForRegistration(input({ registrantEmail: "NOA@example.com" }), { provider })).toEqual({ success: true });
    configureSumit({ SUMIT_DRY_RUN: "false" });
    provider.savePaymentMethod.mockClear();
    expect(await saveSumitPaymentMethodForRegistration(input({ registrantEmail: "stranger@example.com" }), { provider })).toEqual({ success: false, reason: "sumit-not-configured" });
    expect(provider.savePaymentMethod).not.toHaveBeenCalled();
    expect(await saveSumitPaymentMethodForRegistration(input({ registrantEmail: EMAIL }), { provider })).toEqual({ success: true });
  });

  it("an empty SUMIT_TEST_EMAILS list lets nobody in (also with SUMIT_DRY_RUN=false)", async () => {
    const provider = makeProvider();
    for (const dryRun of [undefined, "false"]) {
      configureSumit({ SUMIT_TEST_EMAILS: "", ...(dryRun ? { SUMIT_DRY_RUN: dryRun } : {}) });
      expect(await saveSumitPaymentMethodForRegistration(input(), { provider }), String(dryRun)).toEqual({ success: false, reason: "sumit-not-configured" });
    }
    expect(provider.savePaymentMethod).not.toHaveBeenCalled();
  });

  it("an injected admin client is used instead of the real one (so a test or the lab can never reach the real database)", async () => {
    const calls: string[] = [];
    const fake = { from: (table: string) => { calls.push(table); return from(table); } } as never;
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider: makeProvider(), admin: fake })).toEqual({ success: true });
    expect(calls).toEqual(["business_registrations", "business_subscriptions", "billing_payment_methods", "business_events_log"]);
  });

  it("never falls back to another provider: without PAYMENTS_PROVIDER=sumit (or with a bad value) and no injected provider, it stays off", async () => {
    expect(await saveSumitPaymentMethodForRegistration(input())).toEqual({ success: false, reason: "sumit-not-configured" });
    process.env.PAYMENTS_PROVIDER = "payme";
    expect(await saveSumitPaymentMethodForRegistration(input())).toEqual({ success: false, reason: "sumit-not-configured" });
    process.env.PAYMENTS_PROVIDER = "stripe";
    expect(await saveSumitPaymentMethodForRegistration(input())).toEqual({ success: false, reason: "sumit-not-configured" });
    expect(log).toEqual([]);
  });

  it("only the owner's own PENDING registration with a billable plan and no subscription", async () => {
    const provider = makeProvider();
    db.registration = { ...REGISTRATION, status: "approved" };
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider })).toEqual({ success: false, reason: "not-eligible" });
    db.registration = { ...REGISTRATION };
    expect(await saveSumitPaymentMethodForRegistration(input({ ownerId: "someone-else" }), { provider })).toEqual({ success: false, reason: "not-eligible" });
    db.registration = null;
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider })).toEqual({ success: false, reason: "not-eligible" });
    db.registration = { ...REGISTRATION };
    db.existingSubscription = { id: "sub-1" };
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider })).toEqual({ success: false, reason: "already-exists" });
    db.existingSubscription = null;
    db.registration = { ...REGISTRATION, plan_tier: "free" };
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider })).toEqual({ success: false, reason: "invalid-plan" });
    expect(provider.savePaymentMethod).not.toHaveBeenCalled();
    expect(ops("billing_payment_methods", "upsert")).toEqual([]);
  });

  it("refuses malformed input before any call", async () => {
    const provider = makeProvider();
    for (const bad of [{ registrationId: "not-a-uuid" }, { payer: { name: "  " } }, { payer: { name: "x".repeat(121) } }, { singleUseToken: "short" }, { singleUseToken: "bad token with spaces!!" }, { ownerId: "" }]) {
      expect(await saveSumitPaymentMethodForRegistration(input(bad), { provider }), JSON.stringify(bad)).toEqual({ success: false, reason: "invalid-input" });
    }
    expect(provider.savePaymentMethod).not.toHaveBeenCalled();
  });
});

describe("failures", () => {
  it("SUMIT refusing the token / customer saves nothing", async () => {
    const provider = makeProvider({ savePaymentMethod: vi.fn(async () => Promise.reject(new PaymentProviderError("rejected", "no", "invalid token"))) });
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider })).toEqual({ success: false, reason: "rejected" });
    expect(ops("billing_payment_methods", "upsert")).toEqual([]);
    expect(ops("business_events_log", "insert")).toEqual([]);
  });

  it("network / technical / unreadable replies save nothing", async () => {
    for (const kind of ["network", "provider-error", "invalid-response", "not-configured"] as const) {
      const provider = makeProvider({ savePaymentMethod: vi.fn(async () => Promise.reject(new PaymentProviderError(kind, "x"))) });
      expect(await saveSumitPaymentMethodForRegistration(input(), { provider }), kind).toEqual({ success: false, reason: "provider-error" });
    }
    expect(ops("billing_payment_methods", "upsert")).toEqual([]);
  });

  it("if recording the row fails after SUMIT saved the card, the card is removed again (best effort) and nothing is reported as saved", async () => {
    db.upsertError = { message: "db down" };
    const provider = makeProvider();
    expect(await saveSumitPaymentMethodForRegistration(input(), { provider })).toEqual({ success: false, reason: "unknown-error" });
    expect(provider.removePaymentMethod).toHaveBeenCalledWith("77");
    expect(ops("business_events_log", "insert")).toEqual([]);
  });
});

describe("is a card already saved for this registration (read only)", () => {
  const ask = (overrides: Partial<{ registrationId: string; ownerId: string }> = {}) => getCardSavedStatusForRegistration({ registrationId: REGISTRATION_ID, ownerId: OWNER, ...overrides });

  it("saved: a row exists for the owner's registration - and only the status comes back (no id, mask, token)", async () => {
    db.existingCard = { id: "row-1", provider_customer_id: "77", card_mask: "458045******4580", provider_token: null };
    const result = await ask();
    expect(result).toEqual({ status: "saved" });
    expect(JSON.stringify(result)).not.toMatch(/77|4580|row-1/);
  });

  it("not saved: no row", async () => {
    expect(await ask()).toEqual({ status: "not-saved" });
  });

  it("a read error or a malformed id is 'error' - never 'saved'", async () => {
    db.cardReadError = { message: "db down" };
    expect(await ask()).toEqual({ status: "error" });
    db.cardReadError = null;
    expect(await ask({ registrationId: "not-a-uuid" })).toEqual({ status: "error" });
    expect(await ask({ ownerId: "" })).toEqual({ status: "error" });
  });

  it("reads only: no write of any kind", async () => {
    await ask();
    expect(log.filter((entry) => entry.op !== "select")).toEqual([]);
  });

  it("uses an injected database client when given one", async () => {
    const calls: string[] = [];
    const fake = { from: (table: string) => { calls.push(table); return from(table); } } as never;
    await getCardSavedStatusForRegistration({ registrationId: REGISTRATION_ID, ownerId: OWNER }, { admin: fake });
    expect(calls).toEqual(["billing_payment_methods"]);
  });
});

describe("static guard rails for the new module", () => {
  it("has no console call (the token passes through it) and never writes a PayMe-style token", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(resolve(__dirname, "sumit-payment-method-service.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/console\./);
    expect(code.match(/provider_token/g)?.length).toBe(1);
    expect(code).toMatch(/provider_token: null,/);
    expect(code).not.toMatch(/singleUseToken[^;\n]*(upsert|insert|metadata)|upsert\([^)]*singleUseToken/);
  });
});

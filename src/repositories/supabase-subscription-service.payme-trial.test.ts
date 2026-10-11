import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const BUSINESS_ID = "reg-55555555-5555-5555-5555-555555555555";
const REGISTRATION_ID = "55555555-5555-5555-5555-555555555555";
const OWNER = "owner-uuid-1";
const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";

vi.mock("@/lib/payme/flow-access", () => ({ getPayMeConfigForBusiness: async () => ({ env: "sandbox", baseUrl: "https://sandbox.payme.io/api", webhookSecret: "w".repeat(40) }) }));
vi.mock("@/utils/site-origin", () => ({ getSiteOrigin: () => "https://neveshamir.co.il" }));

const generateSubscription = vi.fn();
const cancelSubscription = vi.fn();
vi.mock("@/lib/payme/client", () => ({
  generatePayMeSubscription: (...args: unknown[]) => generateSubscription(...args),
  cancelPayMeSubscription: (...args: unknown[]) => cancelSubscription(...args),
  parsePayMeDateTime: (value: unknown) => (typeof value === "string" ? new Date("2026-11-07T00:00:00.000Z") : null),
}));

type Op = { table: string; op: string; payload?: unknown };
const log: Op[] = [];
const db = {
  registration: null as Record<string, unknown> | null,
  insertError: null as null | { code: string; message: string },
};

function from(table: string) {
  let cols = "";
  const q = {
    select(c?: string) {
      cols = c ?? "";
      return q;
    },
    eq() {
      return q;
    },
    async maybeSingle() {
      if (table === "business_registrations" && cols.startsWith("id, status")) return { data: { id: REGISTRATION_ID, status: "approved", owner_id: OWNER, slug: "studio-noa" }, error: null };
      if (table === "business_registrations") return { data: db.registration, error: null };
      return { data: null, error: null }; // no existing subscription
    },
    insert(payload: unknown) {
      log.push({ table, op: "insert", payload });
      const result = Promise.resolve({ error: null });
      return Object.assign(result, {
        select: () => ({
          single: async () =>
            db.insertError
              ? { data: null, error: db.insertError }
              : {
                  data: { id: "sub-1", business_registration_id: REGISTRATION_ID, owner_id: OWNER, created_at: "2026-10-08T10:00:00Z", updated_at: "2026-10-08T10:00:00Z", ...(payload as object) },
                  error: null,
                },
        }),
      });
    },
    upsert(payload: unknown) {
      log.push({ table, op: "upsert", payload });
      return Promise.resolve({ error: null });
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

const REGISTRATION = { plan_tier: "plus", selected_billing_interval: "monthly", offer_code: "launch_standard", business_name: "סטודיו נועה" };

function inserted(table: string): Record<string, unknown> | undefined {
  return log.find((entry) => entry.table === table && entry.op === "insert")?.payload as Record<string, unknown> | undefined;
}

describe("startRealBusinessTrialWithPaymentMethod - the PayMe sandbox flow", () => {
  beforeEach(() => {
    log.length = 0;
    generateSubscription.mockReset();
    cancelSubscription.mockReset();
    db.registration = { ...REGISTRATION };
    db.insertError = null;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T10:00:00.000Z"));
    generateSubscription.mockResolvedValue({ subPaymeId: "SUB-123456", nextDate: "2026-11-07 00:00:00" });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function start() {
    const { startRealBusinessTrialWithPaymentMethod } = await import("./supabase-subscription-service");
    return startRealBusinessTrialWithPaymentMethod(BUSINESS_ID, OWNER, TOKEN, "411111******1111");
  }

  it("the token reaches PayMe as the buyer_key, together with the server-built plan - and nothing is charged now", async () => {
    const result = await start();
    expect(result.success).toBe(true);
    expect(generateSubscription).toHaveBeenCalledTimes(1);
    const sent = generateSubscription.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.buyerKey).toBe(TOKEN);
    expect(sent.priceAgorot).toBe(3900);
    expect(sent.iterationType).toBe(3);
    expect(sent.startDate).toBe("07/11/2026"); // 30 days ahead: the first charge is in the future, never at tokenization
    expect(sent.merchantSubscriptionId).toBe(REGISTRATION_ID);
    expect(String(sent.callbackUrl)).toBe(`https://neveshamir.co.il/api/webhooks/payme/${"w".repeat(40)}`);
  });

  it("monthly track: the price is the monthly snapshot", async () => {
    db.registration = { ...REGISTRATION, plan_tier: "premium", selected_billing_interval: "monthly" };
    await start();
    const sent = generateSubscription.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.priceAgorot).toBe(4900);
    expect(sent.iterationType).toBe(3);
    expect(inserted("business_subscriptions")).toMatchObject({ billing_interval: "monthly", price_amount_ils: 49 });
  });

  it("yearly track: the price is the yearly snapshot", async () => {
    db.registration = { ...REGISTRATION, plan_tier: "plus", selected_billing_interval: "yearly" };
    await start();
    const sent = generateSubscription.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.priceAgorot).toBe(39000);
    expect(sent.iterationType).toBe(4);
    expect(inserted("business_subscriptions")).toMatchObject({ billing_interval: "yearly", price_amount_ils: 390 });
  });

  it("regular offer: 30 days", async () => {
    await start();
    expect((generateSubscription.mock.calls[0][0] as Record<string, unknown>).startDate).toBe("07/11/2026");
    expect(inserted("business_subscriptions")).toMatchObject({ offer_code: "launch_standard", trial_days: 30 });
  });

  it("pilot offer: 90 days", async () => {
    db.registration = { ...REGISTRATION, offer_code: "pilot_2026" };
    await start();
    expect((generateSubscription.mock.calls[0][0] as Record<string, unknown>).startDate).toBe("06/01/2027");
    expect(inserted("business_subscriptions")).toMatchObject({ offer_code: "pilot_2026", trial_days: 90 });
  });

  it("stores the PayMe subscription id and the full snapshot, and activates the plan only then", async () => {
    await start();
    expect(inserted("business_subscriptions")).toMatchObject({
      status: "trialing",
      plan_id: "plus",
      payment_provider: "payme",
      provider_subscription_id: "SUB-123456",
      offer_code: "launch_standard",
      trial_days: 30,
      billing_interval: "monthly",
      price_amount_ils: 39,
      price_version: "launch-2026",
    });
    expect(log.find((e) => e.table === "business_registrations" && e.op === "update")?.payload).toEqual({ active_plan_id: "plus" });
    const events = log.find((e) => e.table === "business_events_log")?.payload as { event_type: string; metadata: Record<string, unknown> }[];
    const snapshot = events.find((e) => e.event_type === "trial_started")?.metadata;
    expect(snapshot).toMatchObject({ offerCode: "launch_standard", trialDays: 30, billingInterval: "monthly", priceAmountIls: 39, subStartDate: "07/11/2026", subPaymeId: "SUB-123456" });
  });

  it("never stores card number, CVV or expiry - only the token and the masked card", async () => {
    await start();
    const serialized = JSON.stringify(log);
    expect(serialized).not.toMatch(/cvv|cvc|expiry|expiration|card_number/i);
    expect(log.find((e) => e.table === "billing_payment_methods")?.payload).toMatchObject({ provider_token: TOKEN, card_mask: "411111******1111" });
  });

  it("generate-subscription without a valid sub_payme_id does NOT activate anything", async () => {
    generateSubscription.mockResolvedValue({ subPaymeId: "", nextDate: null });
    const result = await start();
    expect(result).toEqual({ success: false, reason: "payme-rejected" });
    expect(inserted("business_subscriptions")).toBeUndefined();
    expect(log.some((e) => e.table === "business_registrations" && e.op === "update")).toBe(false);
    expect(log.some((e) => e.table === "billing_payment_methods" && e.op === "delete")).toBe(true);
  });

  it("a PayMe error does NOT activate anything either", async () => {
    generateSubscription.mockRejectedValue(new Error("PayMe rejected generate-subscription"));
    const result = await start();
    expect(result).toEqual({ success: false, reason: "payme-rejected" });
    expect(inserted("business_subscriptions")).toBeUndefined();
  });

  it("an invalid plan / track / offer creates no PayMe subscription and stores nothing", async () => {
    for (const bad of [{ plan_tier: "free" }, { selected_billing_interval: "weekly" }, { offer_code: "made_up" }, { offer_code: null }]) {
      log.length = 0;
      generateSubscription.mockClear();
      db.registration = { ...REGISTRATION, ...bad };
      expect(await start()).toEqual({ success: false, reason: "invalid-plan" });
      expect(generateSubscription).not.toHaveBeenCalled();
      expect(log).toEqual([]);
    }
  });

  it("losing the unique-constraint race cancels the PayMe subscription again", async () => {
    db.insertError = { code: "23505", message: "duplicate" };
    expect(await start()).toEqual({ success: false, reason: "already-exists" });
    expect(cancelSubscription).toHaveBeenCalledWith("SUB-123456");
  });

  it("the function takes no price, trial days or start date from its caller (the signature is business, owner, token, card mask)", async () => {
    const { startRealBusinessTrialWithPaymentMethod } = await import("./supabase-subscription-service");
    expect(startRealBusinessTrialWithPaymentMethod.length).toBe(4);
  });
});

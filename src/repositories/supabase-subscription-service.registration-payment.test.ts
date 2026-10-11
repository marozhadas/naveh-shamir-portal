import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const REGISTRATION_ID = "55555555-5555-5555-5555-555555555555";
const OWNER = "owner-uuid-1";
const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";

const registrantConfig = vi.fn();
vi.mock("@/lib/payme/flow-access", () => ({
  getPayMeConfigForBusiness: async () => null,
  getPayMeConfigForRegistrant: (...args: unknown[]) => registrantConfig(...args),
}));
vi.mock("@/utils/site-origin", () => ({ getSiteOrigin: () => "https://neveshamir.co.il" }));

const generateSubscription = vi.fn();
const cancelSubscription = vi.fn();
vi.mock("@/lib/payme/client", () => ({
  generatePayMeSubscription: (...args: unknown[]) => generateSubscription(...args),
  cancelPayMeSubscription: (...args: unknown[]) => cancelSubscription(...args),
  parsePayMeDateTime: () => null,
}));

type Op = { table: string; op: string; payload?: unknown; filters?: Record<string, unknown> };
const log: Op[] = [];
const db = {
  registration: null as Record<string, unknown> | null,
  existingSubscription: null as Record<string, unknown> | null,
  paymeSubscription: null as Record<string, unknown> | null,
  insertError: null as null | { code: string; message: string },
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
        // only the owner's own row is visible: the service filters by id AND owner_id
        const row = db.registration;
        return { data: row && filters.owner_id === row.owner_id && filters.id === row.id ? row : null, error: null };
      }
      if (table === "business_subscriptions") return { data: filters.payment_provider === "payme" ? db.paymeSubscription : db.existingSubscription, error: null };
      return { data: null, error: null };
    },
    insert(payload: unknown) {
      log.push({ table, op: "insert", payload });
      return Object.assign(Promise.resolve({ error: null }), {
        select: () => ({
          single: async () =>
            db.insertError
              ? { data: null, error: db.insertError }
              : { data: { id: "sub-1", business_registration_id: REGISTRATION_ID, owner_id: OWNER, created_at: "2026-10-08T10:00:00Z", updated_at: "2026-10-08T10:00:00Z", ...(payload as object) }, error: null },
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

const REGISTRATION = { id: REGISTRATION_ID, owner_id: OWNER, status: "pending", slug: "הדס-מרוז", plan_tier: "plus", selected_billing_interval: "monthly", offer_code: "launch_standard" };

function ops(table: string, op: string): Op[] {
  return log.filter((entry) => entry.table === table && entry.op === op);
}

describe("completeRegistrationWithPayment - step 6 of the registration: pay, trial starts, the page goes online", () => {
  beforeEach(() => {
    log.length = 0;
    generateSubscription.mockReset();
    cancelSubscription.mockReset();
    registrantConfig.mockReset();
    registrantConfig.mockResolvedValue({ env: "live", baseUrl: "https://live.payme.io/api", webhookSecret: "w".repeat(40) });
    db.registration = { ...REGISTRATION };
    db.existingSubscription = null;
    db.paymeSubscription = null;
    db.insertError = null;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T10:00:00.000Z"));
    generateSubscription.mockResolvedValue({ subPaymeId: "SUB-123456", nextDate: null });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function complete(email: string | null = "owner@example.com") {
    const { completeRegistrationWithPayment } = await import("./supabase-subscription-service");
    return completeRegistrationWithPayment(REGISTRATION_ID, OWNER, email, TOKEN, "411111******1111");
  }

  it("creates the PayMe subscription with the token as buyer_key and the server-built plan, with no charge now", async () => {
    expect((await complete()).success).toBe(true);
    expect(generateSubscription).toHaveBeenCalledTimes(1);
    const sent = generateSubscription.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.buyerKey).toBe(TOKEN);
    expect(sent.priceAgorot).toBe(3900);
    expect(sent.startDate).toBe("07/11/2026");
    expect(sent.merchantSubscriptionId).toBe(REGISTRATION_ID);
  });

  it("puts the business online without an admin: approved, plan active, English slug", async () => {
    await complete();
    const update = ops("business_registrations", "update")[0].payload as Record<string, unknown>;
    expect(update).toMatchObject({ status: "approved", active_plan_id: "plus", rejection_reason: null, slug: `business-${REGISTRATION_ID.slice(0, 8)}` });
    expect(typeof update.reviewed_at).toBe("string");
    expect(ops("business_subscriptions", "insert")[0].payload).toMatchObject({ status: "trialing", plan_id: "plus", provider_subscription_id: "SUB-123456", offer_code: "launch_standard", trial_days: 30, price_amount_ils: 39 });
  });

  it("keeps an already valid English slug", async () => {
    db.registration = { ...REGISTRATION, slug: "studio-noa" };
    await complete();
    expect((ops("business_registrations", "update")[0].payload as Record<string, unknown>).slug).toBe("studio-noa");
  });

  it("records the snapshot and that the business was approved by the payment", async () => {
    await complete();
    const events = ops("business_events_log", "insert")[0].payload as { event_type: string; metadata: Record<string, unknown> }[];
    expect(events.find((e) => e.event_type === "trial_started")?.metadata).toMatchObject({ autoApproved: true, subPaymeId: "SUB-123456", subStartDate: "07/11/2026", trialDays: 30, priceAmountIls: 39 });
  });

  it("premium yearly: the yearly premium snapshot", async () => {
    db.registration = { ...REGISTRATION, plan_tier: "premium", selected_billing_interval: "yearly" };
    await complete();
    expect((generateSubscription.mock.calls[0][0] as Record<string, unknown>).priceAgorot).toBe(49000);
    expect((ops("business_registrations", "update")[0].payload as Record<string, unknown>).active_plan_id).toBe("premium");
  });

  it("no valid sub_payme_id: nothing goes online", async () => {
    generateSubscription.mockResolvedValue({ subPaymeId: "", nextDate: null });
    expect(await complete()).toEqual({ success: false, reason: "payme-rejected" });
    expect(ops("business_subscriptions", "insert")).toEqual([]);
    expect(ops("business_registrations", "update")).toEqual([]);
  });

  it("a PayMe error: nothing goes online", async () => {
    generateSubscription.mockRejectedValue(new Error("PayMe rejected generate-subscription"));
    expect(await complete()).toEqual({ success: false, reason: "payme-rejected" });
    expect(ops("business_registrations", "update")).toEqual([]);
  });

  it("only the owner's own registration: someone else's id creates nothing", async () => {
    const { completeRegistrationWithPayment } = await import("./supabase-subscription-service");
    expect(await completeRegistrationWithPayment(REGISTRATION_ID, "someone-else", "x@example.com", TOKEN, null)).toEqual({ success: false, reason: "not-eligible" });
    expect(generateSubscription).not.toHaveBeenCalled();
    expect(log).toEqual([]);
  });

  it("a rejected, suspended or archived business cannot be put online by paying", async () => {
    for (const status of ["rejected", "suspended", "archived"]) {
      db.registration = { ...REGISTRATION, status };
      expect(await complete()).toEqual({ success: false, reason: "not-eligible" });
    }
    expect(generateSubscription).not.toHaveBeenCalled();
  });

  it("a business that already has a subscription is not charged twice", async () => {
    db.existingSubscription = { id: "sub-existing" };
    expect(await complete()).toEqual({ success: false, reason: "already-exists" });
    expect(generateSubscription).not.toHaveBeenCalled();
  });

  it("an invalid plan creates no PayMe subscription and does not publish", async () => {
    for (const bad of [{ plan_tier: "free" }, { offer_code: "made_up" }, { selected_billing_interval: "weekly" }]) {
      log.length = 0;
      db.registration = { ...REGISTRATION, ...bad };
      expect(await complete()).toEqual({ success: false, reason: "invalid-plan" });
      expect(ops("business_registrations", "update")).toEqual([]);
    }
    expect(generateSubscription).not.toHaveBeenCalled();
  });

  it("when PayMe is not open for this registrant (sandbox, email not on the list) nothing is read or created", async () => {
    registrantConfig.mockResolvedValue(null);
    expect(await complete("real-owner@example.com")).toEqual({ success: false, reason: "payme-not-configured" });
    expect(registrantConfig).toHaveBeenCalledWith("real-owner@example.com");
    expect(generateSubscription).not.toHaveBeenCalled();
    expect(log).toEqual([]);
  });

  it("losing the unique-constraint race cancels the PayMe subscription again", async () => {
    db.insertError = { code: "23505", message: "duplicate" };
    expect(await complete()).toEqual({ success: false, reason: "already-exists" });
    expect(cancelSubscription).toHaveBeenCalledWith("SUB-123456");
    expect(ops("business_registrations", "update")).toEqual([]);
  });
});

describe("cancelPayMeSubscriptionForRejection - rejecting a business that went live through payment", () => {
  beforeEach(() => {
    log.length = 0;
    cancelSubscription.mockReset();
    cancelSubscription.mockResolvedValue(undefined);
    db.paymeSubscription = { id: "sub-1", provider_subscription_id: "SUB-123456", status: "trialing" };
  });

  it("stops the PayMe subscription and marks it canceled", async () => {
    const { cancelPayMeSubscriptionForRejection } = await import("./supabase-subscription-service");
    expect(await cancelPayMeSubscriptionForRejection(REGISTRATION_ID, "admin-1")).toEqual({ success: true, hadSubscription: true });
    expect(cancelSubscription).toHaveBeenCalledWith("SUB-123456");
    expect(ops("business_subscriptions", "update")[0].payload).toMatchObject({ status: "canceled" });
  });

  it("a PayMe failure is reported, so the caller does not reject a business that is still being billed", async () => {
    cancelSubscription.mockRejectedValue(new Error("boom"));
    const { cancelPayMeSubscriptionForRejection } = await import("./supabase-subscription-service");
    expect(await cancelPayMeSubscriptionForRejection(REGISTRATION_ID, "admin-1")).toEqual({ success: false, reason: "payme-error" });
    expect(ops("business_subscriptions", "update")).toEqual([]);
  });

  it("nothing to cancel is fine", async () => {
    db.paymeSubscription = null;
    const { cancelPayMeSubscriptionForRejection } = await import("./supabase-subscription-service");
    expect(await cancelPayMeSubscriptionForRejection(REGISTRATION_ID, "admin-1")).toEqual({ success: true, hadSubscription: false });
    expect(cancelSubscription).not.toHaveBeenCalled();

    db.paymeSubscription = { id: "sub-1", provider_subscription_id: "SUB-123456", status: "canceled" };
    expect(await cancelPayMeSubscriptionForRejection(REGISTRATION_ID, "admin-1")).toEqual({ success: true, hadSubscription: false });
    expect(cancelSubscription).not.toHaveBeenCalled();
  });
});

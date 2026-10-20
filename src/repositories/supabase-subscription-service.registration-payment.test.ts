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
const paymeConfig = { value: null as null | { env: "sandbox" | "live"; baseUrl: string; sellerId: string; hostedFieldsKey: string; webhookSecret: string } };
vi.mock("@/lib/payme/config", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/payme/config")>()), getPayMeConfig: () => paymeConfig.value }));
vi.mock("@/utils/site-origin", () => ({ getSiteOrigin: () => "https://neveshamir.co.il" }));

const order: string[] = [];
const generateSubscription = vi.fn();
const cancelSubscription = vi.fn();
vi.mock("@/lib/payme/client", () => ({
  generatePayMeSubscription: async (...args: unknown[]) => {
    order.push("generate-subscription");
    return generateSubscription(...args);
  },
  cancelPayMeSubscription: (...args: unknown[]) => cancelSubscription(...args),
  parsePayMeDateTime: () => null,
}));

type Op = { table: string; op: string; payload?: unknown; filters?: Record<string, unknown> };
const log: Op[] = [];
const db = {
  registration: null as Record<string, unknown> | null,
  existingSubscription: null as Record<string, unknown> | null,
  paymeSubscription: null as Record<string, unknown> | null,
  paymentMethod: null as Record<string, unknown> | null,
  ownerExists: true,
  subscriptionInsertError: null as null | { code: string; message: string },
  registrationUpdateError: null as null | { message: string },
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
        if (!row) return { data: null, error: null };
        // the owner-scoped lookups (step 6) filter by owner_id too; the admin lookup only by id
        if ("owner_id" in filters && filters.owner_id !== row.owner_id) return { data: null, error: null };
        return { data: filters.id === row.id ? row : null, error: null };
      }
      if (table === "business_subscriptions") return { data: filters.payment_provider === "payme" ? db.paymeSubscription : db.existingSubscription, error: null };
      if (table === "billing_payment_methods") return { data: db.paymentMethod, error: null };
      return { data: null, error: null };
    },
    insert(payload: unknown) {
      log.push({ table, op: "insert", payload });
      if (table === "business_subscriptions") order.push("insert-subscription");
      return Object.assign(Promise.resolve({ error: null }), {
        select: () => ({
          single: async () =>
            db.subscriptionInsertError
              ? { data: null, error: db.subscriptionInsertError }
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
      if (table === "business_registrations") order.push("update-registration");
      return { eq: async () => ({ error: table === "business_registrations" ? db.registrationUpdateError : null }) };
    },
    delete() {
      // chainable (.eq().eq()) and awaitable, recording its filters so a test can see WHICH rows a delete targets
      const filters: Array<[string, unknown]> = [];
      log.push({ table, op: "delete", filters } as never);
      const chain = {
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return chain;
        },
        then(resolve: (value: { error: null }) => unknown) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return chain;
    },
  };
  return q;
}
vi.mock("@/lib/supabase/admin-client", () => ({
  isSupabaseAdminConfigured: () => true,
  createAdminSupabaseClient: () => ({ from, auth: { admin: { getUserById: async () => (db.ownerExists ? { data: { user: { id: OWNER } }, error: null } : { data: { user: null }, error: { message: "not found" } }) } } }),
}));

const REGISTRATION = { id: REGISTRATION_ID, owner_id: OWNER, status: "pending", slug: "studio-noa", plan_tier: "plus", selected_billing_interval: "monthly", offer_code: "launch_standard" };

function ops(table: string, op: string): Op[] {
  return log.filter((entry) => entry.table === table && entry.op === op);
}

function resetAll() {
  log.length = 0;
  order.length = 0;
  generateSubscription.mockReset();
  cancelSubscription.mockReset();
  registrantConfig.mockReset();
  registrantConfig.mockResolvedValue({ env: "live" });
  paymeConfig.value = { env: "live", baseUrl: "https://live.payme.io/api", sellerId: "MPL-SELLER-1", hostedFieldsKey: "public-key", webhookSecret: "w".repeat(40) };
  db.registration = { ...REGISTRATION };
  db.existingSubscription = null;
  db.paymeSubscription = null;
  db.paymentMethod = { provider_token: TOKEN, card_mask: "411111******1111" };
  db.ownerExists = true;
  db.subscriptionInsertError = null;
  db.registrationUpdateError = null;
  generateSubscription.mockResolvedValue({ subPaymeId: "SUB-123456", nextDate: null });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T10:00:00.000Z"));
}

describe("registration step 6 - savePaymentMethodForRegistration: tokenization only", () => {
  beforeEach(resetAll);

  it("PayMe keeps working after the SUMIT columns appeared: the row states provider payme, the token, and null SUMIT fields", async () => {
    const { savePaymentMethodForRegistration } = await import("./supabase-subscription-service");
    expect(await savePaymentMethodForRegistration(REGISTRATION_ID, OWNER, "noa@example.com", TOKEN, "411111******1111")).toEqual({ success: true });
    expect(ops("billing_payment_methods", "upsert")[0].payload).toMatchObject({ provider: "payme", provider_token: TOKEN, provider_customer_id: null, provider_payment_method_id: null });
  });
  afterEach(() => vi.useRealTimers());

  async function save(email: string | null = "owner@example.com") {
    const { savePaymentMethodForRegistration } = await import("./supabase-subscription-service");
    return savePaymentMethodForRegistration(REGISTRATION_ID, OWNER, email, TOKEN, "411111******1111");
  }

  it("keeps the token (the buyer_key) and the card mask server-side - and starts NOTHING", async () => {
    expect(await save()).toEqual({ success: true });
    expect(ops("billing_payment_methods", "upsert")[0].payload).toMatchObject({ business_registration_id: REGISTRATION_ID, owner_id: OWNER, provider: "payme", provider_token: TOKEN, card_mask: "411111******1111" });
    expect(generateSubscription).not.toHaveBeenCalled(); // no generate-subscription, so no sub_payme_id
    expect(ops("business_subscriptions", "insert")).toEqual([]); // no subscription, no trial_started_at / trial_ends_at
    expect(ops("business_registrations", "update")).toEqual([]); // still pending, not approved, not published
    expect(ops("business_registrations", "insert")).toEqual([]); // and no second registration
  });

  it("the audit entry says a card was added at registration - and carries no token", async () => {
    await save();
    const event = ops("business_events_log", "insert")[0].payload as { event_type: string; metadata: Record<string, unknown> };
    expect(event.event_type).toBe("payment_method_added");
    expect(JSON.stringify(event)).not.toContain(TOKEN);
  });

  it("tokenizing again (retry / refresh) replaces the one row of the registration - no duplicate", async () => {
    await save();
    await save();
    const upserts = ops("billing_payment_methods", "upsert");
    expect(upserts).toHaveLength(2);
    // the same conflict key both times, so the database keeps a single row per registration
    expect(upserts.every((entry) => (entry.payload as { business_registration_id: string }).business_registration_id === REGISTRATION_ID)).toBe(true);
    expect(ops("business_registrations", "insert")).toEqual([]);
    expect(ops("business_subscriptions", "insert")).toEqual([]);
  });

  it("only the owner's own registration", async () => {
    const { savePaymentMethodForRegistration } = await import("./supabase-subscription-service");
    expect(await savePaymentMethodForRegistration(REGISTRATION_ID, "someone-else", "x@example.com", TOKEN, null)).toEqual({ success: false, reason: "not-eligible" });
    expect(log).toEqual([]);
  });

  it("only while it is pending (an approved or rejected business takes no new card here)", async () => {
    for (const status of ["approved", "rejected", "suspended"]) {
      db.registration = { ...REGISTRATION, status };
      expect(await save()).toEqual({ success: false, reason: "not-eligible" });
    }
    expect(ops("billing_payment_methods", "upsert")).toEqual([]);
  });

  it("not for a business that already has a subscription", async () => {
    db.existingSubscription = { id: "sub-existing" };
    expect(await save()).toEqual({ success: false, reason: "already-exists" });
    expect(ops("billing_payment_methods", "upsert")).toEqual([]);
  });

  it("not for a plan that could never be billed", async () => {
    for (const bad of [{ plan_tier: "free" }, { offer_code: "made_up" }]) {
      db.registration = { ...REGISTRATION, ...bad };
      expect(await save()).toEqual({ success: false, reason: "invalid-plan" });
    }
    expect(ops("billing_payment_methods", "upsert")).toEqual([]);
  });

  it("sandbox: a registrant who is not on the test list saves nothing", async () => {
    registrantConfig.mockResolvedValue(null);
    expect(await save("real-owner@example.com")).toEqual({ success: false, reason: "payme-not-configured" });
    expect(registrantConfig).toHaveBeenCalledWith("real-owner@example.com");
    expect(log).toEqual([]);
  });
});

describe("admin approval = activation - activateRegistrationOnApproval", () => {
  beforeEach(resetAll);
  afterEach(() => vi.useRealTimers());

  async function approve() {
    const { activateRegistrationOnApproval } = await import("./supabase-subscription-service");
    return activateRegistrationOnApproval(REGISTRATION_ID, "admin-1");
  }

  it("Regular offer: 30 days; the saved token is the buyer_key; the price comes from the stored plan", async () => {
    const result = await approve();
    expect(result.success).toBe(true);
    const sent = generateSubscription.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.buyerKey).toBe(TOKEN);
    expect(sent.startDate).toBe("07/11/2026");
    expect(sent.priceAgorot).toBe(3900);
    expect(sent.merchantSubscriptionId).toBe(REGISTRATION_ID);
    expect(ops("business_subscriptions", "insert")[0].payload).toMatchObject({ offer_code: "launch_standard", trial_days: 30, status: "trialing", provider_subscription_id: "SUB-123456" });
    if (result.success) expect(result).toMatchObject({ offerCode: "launch_standard", trialDays: 30 });
  });

  it("Pilot offer (chosen by the admin before approving): 90 days", async () => {
    db.registration = { ...REGISTRATION, offer_code: "pilot_2026" };
    const result = await approve();
    expect(result.success).toBe(true);
    expect((generateSubscription.mock.calls[0][0] as Record<string, unknown>).startDate).toBe("06/01/2027");
    expect(ops("business_subscriptions", "insert")[0].payload).toMatchObject({ offer_code: "pilot_2026", trial_days: 90 });
    if (result.success) expect(result).toMatchObject({ offerCode: "pilot_2026", trialDays: 90 });
  });

  it("premium yearly: yearly premium snapshot", async () => {
    db.registration = { ...REGISTRATION, plan_tier: "premium", selected_billing_interval: "yearly" };
    await approve();
    expect((generateSubscription.mock.calls[0][0] as Record<string, unknown>).priceAgorot).toBe(49000);
  });

  it("full success: subscription + trial + approved + published - in the order validate -> generate -> persist -> approve", async () => {
    expect((await approve()).success).toBe(true);
    expect(order).toEqual(["generate-subscription", "insert-subscription", "update-registration"]);
    expect(ops("business_registrations", "update")[0].payload).toMatchObject({ status: "approved", active_plan_id: "plus", rejection_reason: null });
    const events = ops("business_events_log", "insert")[0].payload as { event_type: string; metadata: Record<string, unknown> }[];
    expect(events.find((e) => e.event_type === "trial_started")?.metadata).toMatchObject({ activatedByAdminApproval: true, adminId: "admin-1", subPaymeId: "SUB-123456", subStartDate: "07/11/2026", trialDays: 30, offerCode: "launch_standard", priceAmountIls: 39 });
  });

  it("approval without a saved buyer_key fails and approves nothing", async () => {
    db.paymentMethod = null;
    expect(await approve()).toEqual({ success: false, reason: "no-payment-method" });
    expect(generateSubscription).not.toHaveBeenCalled();
    expect(ops("business_registrations", "update")).toEqual([]);
    db.paymentMethod = { provider_token: "short", card_mask: null };
    expect(await approve()).toEqual({ success: false, reason: "no-payment-method" });
    expect(generateSubscription).not.toHaveBeenCalled();
  });

  it("generate-subscription fails: the business stays pending, no trial, no subscription row", async () => {
    generateSubscription.mockRejectedValue(new Error("PayMe rejected generate-subscription"));
    expect(await approve()).toEqual({ success: false, reason: "payme-rejected" });
    expect(ops("business_subscriptions", "insert")).toEqual([]);
    expect(ops("business_registrations", "update")).toEqual([]);
    expect(ops("billing_payment_methods", "delete")).toEqual([]); // the saved card is kept so the admin can retry
  });

  it("an answer without a valid sub_payme_id: the business stays pending", async () => {
    for (const bad of ["", "has space", undefined]) {
      log.length = 0;
      generateSubscription.mockResolvedValue({ subPaymeId: bad, nextDate: null });
      expect(await approve()).toEqual({ success: false, reason: "payme-rejected" });
      expect(ops("business_subscriptions", "insert")).toEqual([]);
      expect(ops("business_registrations", "update")).toEqual([]);
    }
  });

  it("a failed subscription write cancels the PayMe subscription again and approves nothing", async () => {
    db.subscriptionInsertError = { code: "XX000", message: "boom" };
    expect((await approve()).success).toBe(false);
    expect(cancelSubscription).toHaveBeenCalledWith("SUB-123456");
    expect(ops("business_registrations", "update")).toEqual([]);
  });

  it("never half approved: if the approval write fails after the subscription row, PayMe is cancelled and the row removed", async () => {
    db.registrationUpdateError = { message: "boom" };
    expect(await approve()).toEqual({ success: false, reason: "approve-failed" });
    expect(cancelSubscription).toHaveBeenCalledWith("SUB-123456");
    expect(ops("business_subscriptions", "delete")).toHaveLength(1);
  });

  it("cannot activate a trial twice", async () => {
    expect((await approve()).success).toBe(true);
    db.existingSubscription = { id: "sub-1" };
    db.registration = { ...REGISTRATION, status: "approved" };
    generateSubscription.mockClear();
    expect(await approve()).toEqual({ success: false, reason: "not-pending" });
    db.registration = { ...REGISTRATION };
    expect(await approve()).toEqual({ success: false, reason: "already-exists" });
    expect(generateSubscription).not.toHaveBeenCalled();
  });

  it("only a pending business, with a valid owner and a clean English slug, and PayMe configured", async () => {
    db.registration = { ...REGISTRATION, status: "rejected" };
    expect(await approve()).toEqual({ success: false, reason: "not-pending" });
    db.registration = { ...REGISTRATION, owner_id: null };
    expect(await approve()).toEqual({ success: false, reason: "no-owner" });
    db.registration = { ...REGISTRATION };
    db.ownerExists = false;
    expect(await approve()).toEqual({ success: false, reason: "no-owner" });
    db.ownerExists = true;
    db.registration = { ...REGISTRATION, slug: "הדס-מרוז" };
    expect(await approve()).toEqual({ success: false, reason: "invalid-slug" });
    db.registration = { ...REGISTRATION };
    paymeConfig.value = null;
    expect(await approve()).toEqual({ success: false, reason: "payme-not-configured" });
    db.registration = null;
    paymeConfig.value = { env: "live", baseUrl: "x", sellerId: "x", hostedFieldsKey: "x", webhookSecret: "w".repeat(40) };
    expect(await approve()).toEqual({ success: false, reason: "not-found" });
    expect(generateSubscription).not.toHaveBeenCalled();
    expect(log.filter((entry) => entry.op === "insert" || entry.op === "update")).toEqual([]);
  });

  it("an invalid plan / track / offer creates nothing", async () => {
    for (const bad of [{ plan_tier: "free" }, { selected_billing_interval: "weekly" }, { offer_code: "made_up" }, { offer_code: null }]) {
      db.registration = { ...REGISTRATION, ...bad };
      expect(await approve()).toEqual({ success: false, reason: "invalid-plan" });
    }
    expect(generateSubscription).not.toHaveBeenCalled();
  });

  it("the buyer_key never leaves the server: not in results, audit records or logs - also when things fail", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const results = [await approve()];
    generateSubscription.mockRejectedValue(new Error("PayMe rejected generate-subscription"));
    db.existingSubscription = null;
    results.push(await approve());
    db.registrationUpdateError = { message: "boom" };
    generateSubscription.mockResolvedValue({ subPaymeId: "SUB-123456", nextDate: null });
    results.push(await approve());
    expect(JSON.stringify(results)).not.toContain(TOKEN);
    expect(JSON.stringify(log.filter((entry) => entry.table === "business_events_log"))).not.toContain(TOKEN);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(TOKEN);
    consoleError.mockRestore();
  });
});

describe("rejecting a business - cancelPayMeSubscriptionForRejection", () => {
  beforeEach(resetAll);
  afterEach(() => vi.useRealTimers());

  async function reject() {
    const { cancelPayMeSubscriptionForRejection } = await import("./supabase-subscription-service");
    return cancelPayMeSubscriptionForRejection(REGISTRATION_ID, "admin-1");
  }

  it("rejected before any subscription existed: no PayMe call at all, and the saved card is removed", async () => {
    expect(await reject()).toEqual({ success: true, hadSubscription: false });
    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(generateSubscription).not.toHaveBeenCalled();
    expect(ops("billing_payment_methods", "delete")).toHaveLength(1);
  });

  it("a subscription that already exists is cancelled through the PayMe cancel path first, then the card is removed", async () => {
    db.paymeSubscription = { id: "sub-1", provider_subscription_id: "SUB-123456", status: "trialing" };
    cancelSubscription.mockResolvedValue(undefined);
    expect(await reject()).toEqual({ success: true, hadSubscription: true });
    expect(cancelSubscription).toHaveBeenCalledWith("SUB-123456");
    expect(ops("business_subscriptions", "update")[0].payload).toMatchObject({ status: "canceled" });
    expect(ops("billing_payment_methods", "delete")).toHaveLength(1);
  });

  it("a PayMe cancel failure is reported and the card is kept, so the caller does not reject a business that is still being billed", async () => {
    db.paymeSubscription = { id: "sub-1", provider_subscription_id: "SUB-123456", status: "trialing" };
    cancelSubscription.mockRejectedValue(new Error("boom"));
    expect(await reject()).toEqual({ success: false, reason: "payme-error" });
    expect(ops("business_subscriptions", "update")).toEqual([]);
    expect(ops("billing_payment_methods", "delete")).toEqual([]);
  });

  it("an already-ended subscription needs no cancel", async () => {
    db.paymeSubscription = { id: "sub-1", provider_subscription_id: "SUB-123456", status: "canceled" };
    expect(await reject()).toEqual({ success: true, hadSubscription: false });
    expect(cancelSubscription).not.toHaveBeenCalled();
  });
});

describe("the admin can see that a card is ready - and only its mask", () => {
  beforeEach(resetAll);
  afterEach(() => vi.useRealTimers());

  it("returns whether a card exists and the mask, never the token", async () => {
    const { getSavedPaymentMethodInfo } = await import("./supabase-subscription-service");
    const info = await getSavedPaymentMethodInfo(REGISTRATION_ID);
    expect(info).toEqual({ hasPaymentMethod: true, cardMask: "411111******1111" });
    expect(JSON.stringify(info)).not.toContain(TOKEN);
    db.paymentMethod = null;
    expect(await getSavedPaymentMethodInfo(REGISTRATION_ID)).toEqual({ hasPaymentMethod: false, cardMask: null });
  });
});

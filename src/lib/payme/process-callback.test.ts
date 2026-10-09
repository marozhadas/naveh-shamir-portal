import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * End-to-end behaviour of the PayMe callback pipeline — the REAL route handler and the REAL processor — against a
 * small stateful in-memory database. PayMe confirmed the Seller-account model: unsigned callbacks, no read-back
 * endpoint; trust = our secret in the URL + our seller id + a subscription id we stored. These tests prove the
 * contract that matters for money: an unverified callback changes nothing and records no revenue, a duplicate never
 * counts twice, and a good callback is applied exactly once.
 */

type Row = Record<string, unknown>;
type Db = Record<"billing_events" | "business_subscriptions" | "business_registrations" | "billing_transactions" | "business_events_log", Row[]>;

const db: Db = { billing_events: [], business_subscriptions: [], business_registrations: [], billing_transactions: [], business_events_log: [] };

class Query {
  private op: "select" | "insert" | "update" | "upsert" = "select";
  private payload: Row = {};
  private filters: [string, unknown][] = [];
  private returning = false;

  constructor(private readonly table: keyof Db) {}

  select() {
    if (this.op !== "select") this.returning = true;
    return this;
  }
  insert(payload: Row) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  upsert(payload: Row) {
    this.op = "upsert";
    this.payload = payload;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }
  async maybeSingle() {
    return this.run(true);
  }
  then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
    return Promise.resolve(this.run(false)).then(resolve, reject);
  }

  private run(single: boolean): { data?: unknown; error: { code?: string; message: string } | null } {
    const rows = db[this.table];
    const matches = (row: Row) => this.filters.every(([column, value]) => row[column] === value);
    if (this.op === "select") {
      const found = rows.filter(matches);
      return { data: single ? (found[0] ?? null) : found, error: null };
    }
    if (this.op === "insert") {
      if (this.table === "billing_events" && rows.some((row) => row.provider === this.payload.provider && row.provider_event_id === this.payload.provider_event_id)) {
        return { data: null, error: { code: "23505", message: "duplicate" } };
      }
      const row = { id: `${this.table}-${rows.length + 1}`, ...this.payload };
      rows.push(row);
      return { data: this.returning ? { id: row.id } : null, error: null };
    }
    if (this.op === "update") {
      for (const row of rows.filter(matches)) Object.assign(row, this.payload);
      return { data: null, error: null };
    }
    // upsert with ignoreDuplicates on provider_transaction_id (the only upsert the processor does)
    if (!rows.some((row) => row.provider_transaction_id === this.payload.provider_transaction_id)) rows.push({ id: `${this.table}-${rows.length + 1}`, ...this.payload });
    return { error: null };
  }
}

vi.mock("@/lib/supabase/admin-client", () => ({ createAdminSupabaseClient: () => ({ from: (table: keyof Db) => new Query(table) }) }));

const ENV_KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"] as const;
const WEBHOOK_SECRET = "w".repeat(40);
const SELLER = "MPL-TEST-SELLER";
const PAYME_SUB = "SUB-REAL-1";
const REGISTRATION = "reg-1";

function freshSubscription(overrides: Row = {}): Row {
  return {
    id: "sub-local-1",
    business_registration_id: REGISTRATION,
    owner_id: "owner-1",
    payment_provider: "payme",
    provider_subscription_id: PAYME_SUB,
    plan_id: "plus",
    status: "trialing",
    billing_interval: "monthly",
    price_amount_ils: 39,
    offer_code: "launch_standard",
    trial_ends_at: "2026-01-01T00:00:00.000Z", // long over, so a first payment is on time
    payment_failed_at: null,
    grace_period_ends_at: null,
    last_payment_succeeded_at: null,
    current_period_ends_at: null,
    ...overrides,
  };
}

function body(fields: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) if (value !== null) params.set(key, value);
  return params.toString();
}

const good = (notify: string, extra: Record<string, string | null> = {}) => body({ notify_type: notify, sub_payme_id: PAYME_SUB, seller_payme_id: SELLER, subscription_id: REGISTRATION, ...extra });

async function post(rawBody: string, secret = WEBHOOK_SECRET): Promise<Response> {
  const { POST } = await import("@/app/api/webhooks/payme/[secret]/route");
  const request = new Request("https://example.test/api/webhooks/payme/x", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: rawBody });
  return POST(request, { params: Promise.resolve({ secret }) });
}

const subscription = () => db.business_subscriptions[0];
const revenueAgorot = () => db.billing_transactions.filter((t) => t.status === "succeeded").reduce((sum, t) => sum + Number(t.amount_agorot), 0);
const snapshotOfState = () => JSON.stringify({ sub: db.business_subscriptions, tx: db.billing_transactions, reg: db.business_registrations, log: db.business_events_log });

describe("PayMe callback pipeline", () => {
  beforeEach(() => {
    for (const key of Object.keys(db) as (keyof Db)[]) db[key].length = 0;
    db.business_subscriptions.push(freshSubscription());
    db.business_registrations.push({ id: REGISTRATION, business_name: "עסק בדיקה", plan_tier: "plus", offer_code: "launch_standard", active_plan_id: "basic" });
    process.env.PAYME_ENV = "sandbox";
    process.env.PAYME_SELLER_ID = SELLER;
    process.env.PAYME_HOSTED_FIELDS_KEY = "public-key-test";
    process.env.PAYME_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  describe("unverified callbacks change nothing and record no revenue", () => {
    it("wrong secret in the URL → 404, nothing read or written at all", async () => {
      const before = snapshotOfState();
      for (const wrong of ["wrong", "w".repeat(39), "w".repeat(41), ""]) {
        const response = await post(good("sub-active"), wrong);
        expect(response.status).toBe(404);
      }
      expect(db.billing_events).toEqual([]); // not even an event row: the body was never looked at
      expect(snapshotOfState()).toBe(before);
      expect(revenueAgorot()).toBe(0);
    });

    it("wrong seller_payme_id → failed event, subscription and revenue untouched", async () => {
      const before = snapshotOfState();
      const response = await post(good("sub-active", { seller_payme_id: "MPL-SOMEONE-ELSE" }));
      expect(response.status).toBe(200);
      expect(snapshotOfState()).toBe(before);
      expect(revenueAgorot()).toBe(0);
      expect(db.billing_events).toHaveLength(1);
      expect(db.billing_events[0]).toMatchObject({ status: "failed", error: "callback-not-verified: seller-mismatch" });
    });

    it("seller_payme_id missing → failed event (fail-safe), nothing changes", async () => {
      const before = snapshotOfState();
      await post(good("sub-active", { seller_payme_id: null }));
      expect(snapshotOfState()).toBe(before);
      expect(db.billing_events[0]).toMatchObject({ status: "failed", error: "callback-not-verified: seller-id-missing" });
    });

    it("sub_payme_id we never stored → failed event, nothing changes", async () => {
      const before = snapshotOfState();
      await post(good("sub-active", { sub_payme_id: "SUB-UNKNOWN" }));
      expect(snapshotOfState()).toBe(before);
      expect(revenueAgorot()).toBe(0);
      expect(db.billing_events[0]).toMatchObject({ status: "failed", error: "callback-not-verified: unknown-subscription" });
    });

    it("our own subscription_id echoed back but belonging to another business → failed event, nothing changes", async () => {
      const before = snapshotOfState();
      await post(good("sub-active", { subscription_id: "reg-someone-else" }));
      expect(snapshotOfState()).toBe(before);
      expect(db.billing_events[0]).toMatchObject({ status: "failed", error: "callback-not-verified: merchant-id-mismatch" });
    });

    it("a body with no subscription id at all is rejected outright (400) and writes nothing", async () => {
      const response = await post(body({ notify_type: "sub-active", seller_payme_id: SELLER }));
      expect(response.status).toBe(400);
      expect(db.billing_events).toEqual([]);
    });

    it("a payment reported in the middle of the trial is not booked: failed event 'needs-attention'", async () => {
      db.business_subscriptions[0] = freshSubscription({ trial_ends_at: "2099-01-01T00:00:00.000Z" });
      const before = snapshotOfState();
      await post(good("sub-active"));
      expect(snapshotOfState()).toBe(before);
      expect(revenueAgorot()).toBe(0);
      expect(db.billing_events[0]).toMatchObject({ status: "failed", error: "needs-attention: payment-reported-during-trial" });
    });

    it("failed events carry no card/token data — only the whitelisted summary", async () => {
      await post(good("sub-active", { seller_payme_id: "MPL-SOMEONE-ELSE", buyer_key: "BUYER-SECRET-TOKEN", card_number: "4111111111111111" }));
      const stored = JSON.stringify(db.billing_events);
      expect(stored).not.toContain("BUYER-SECRET-TOKEN");
      expect(stored).not.toContain("4111111111111111");
    });
  });

  describe("a verified callback is applied exactly once", () => {
    it("sub-active: trial → active, ONE succeeded transaction at our snapshot price, plan activated, event processed", async () => {
      const response = await post(good("sub-active"));
      expect(response.status).toBe(200);
      expect(subscription()).toMatchObject({ status: "active", payment_failed_at: null, grace_period_ends_at: null });
      expect(subscription().last_payment_succeeded_at).toBeTruthy();
      expect(db.billing_transactions).toHaveLength(1);
      expect(db.billing_transactions[0]).toMatchObject({ provider: "payme", kind: "charge", status: "succeeded", amount_agorot: 3900, business_registration_id: REGISTRATION, plan_id: "plus", billing_interval: "monthly" });
      expect(revenueAgorot()).toBe(3900);
      expect(db.business_registrations[0].active_plan_id).toBe("plus");
      expect(db.business_events_log).toHaveLength(1);
      expect(db.business_events_log[0].event_type).toBe("subscription_activated");
      expect(db.billing_events).toHaveLength(1);
      expect(db.billing_events[0].status).toBe("processed");
    });

    it("the amount is OUR price — a callback claiming another price changes nothing about the revenue", async () => {
      await post(good("sub-active", { sub_price: "1", price: "1", sale_price: "1" }));
      expect(revenueAgorot()).toBe(3900);
    });

    it("the SAME callback delivered twice is acknowledged as a duplicate and does not create a second transaction", async () => {
      const first = await post(good("sub-active", { sub_iterations_completed: "1" }));
      const stateAfterFirst = snapshotOfState();
      const second = await post(good("sub-active", { sub_iterations_completed: "1" }));
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(await second.json()).toMatchObject({ outcome: "duplicate" });
      expect(db.billing_transactions).toHaveLength(1);
      expect(revenueAgorot()).toBe(3900);
      expect(db.billing_events).toHaveLength(1);
      expect(snapshotOfState()).toBe(stateAfterFirst);
    });

    it("one charge announced twice with different bodies (sub-active then sub-iteration-success) is still ONE payment", async () => {
      await post(good("sub-active"));
      const second = await post(good("sub-iteration-success"));
      expect(await second.json()).toMatchObject({ outcome: "ignored" });
      expect(db.billing_transactions).toHaveLength(1);
      expect(revenueAgorot()).toBe(3900);
      expect(db.billing_events.map((e) => e.status)).toEqual(["processed", "ignored"]);
    });

    it("sub-failure: opens the 7-day grace period, records a FAILED transaction and no revenue", async () => {
      db.business_subscriptions[0] = freshSubscription({ status: "active", last_payment_succeeded_at: "2026-09-08T10:00:00.000Z" });
      await post(good("sub-failure", { sub_error_text: "Card declined" }));
      expect(subscription()).toMatchObject({ status: "grace-period", payment_failure_reason: "Card declined" });
      expect(subscription().grace_period_ends_at).toBeTruthy();
      expect(db.billing_transactions).toHaveLength(1);
      expect(db.billing_transactions[0]).toMatchObject({ kind: "failed", status: "failed" });
      expect(revenueAgorot()).toBe(0);
      expect(db.business_events_log[0].event_type).toBe("payment_failed");
    });

    it("sub-cancel: marks the subscription canceled, books nothing", async () => {
      await post(good("sub-cancel"));
      expect(subscription()).toMatchObject({ status: "canceled", cancel_at_period_end: true });
      expect(db.billing_transactions).toEqual([]);
    });

    it("sub-create (sent before our own row exists) is informational: ignored, never an alarm, changes nothing", async () => {
      db.business_subscriptions.length = 0;
      const response = await post(good("sub-create"));
      expect(response.status).toBe(200);
      expect(db.billing_events[0].status).toBe("ignored");
      expect(db.billing_transactions).toEqual([]);
    });
  });
});

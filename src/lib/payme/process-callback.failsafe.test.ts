import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Fail-safe contract: a PayMe callback that cannot be verified against PayMe itself must NEVER change a
 * subscription, write a transaction (revenue), activate a plan or log a business event. The only thing it may do
 * is leave a "failed" event row, which the admin sees under "דורש טיפול".
 */

type Call = { table: string; op: "insert" | "update" | "upsert" | "delete"; payload: unknown };
const calls: Call[] = [];

const SUBSCRIPTION_ROW = {
  id: "sub-local-1",
  business_registration_id: "reg-1",
  plan_id: "plus",
  status: "trialing",
  billing_interval: "monthly",
  price_amount_ils: 39,
  trial_ends_at: "2026-10-01T00:00:00.000Z",
  payment_failed_at: null,
  grace_period_ends_at: null,
  last_payment_succeeded_at: null,
  current_period_ends_at: null,
  offer_code: "launch_standard",
};

let subscriptionRow: typeof SUBSCRIPTION_ROW | null = SUBSCRIPTION_ROW;

function builder(table: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.insert = (payload: unknown) => {
    calls.push({ table, op: "insert", payload });
    return chain;
  };
  chain.update = (payload: unknown) => {
    calls.push({ table, op: "update", payload });
    return chain;
  };
  chain.upsert = (payload: unknown) => {
    calls.push({ table, op: "upsert", payload });
    return Promise.resolve({ error: null });
  };
  chain.select = self;
  chain.eq = self;
  chain.maybeSingle = async () => {
    if (table === "billing_events" && calls.some((c) => c.table === "billing_events" && c.op === "insert")) return { data: { id: "event-1" }, error: null };
    if (table === "business_subscriptions") return { data: subscriptionRow, error: null };
    return { data: null, error: null };
  };
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase/admin-client", () => ({ createAdminSupabaseClient: () => ({ from: (table: string) => builder(table) }) }));

const getSubscription = vi.fn();
vi.mock("./client", () => ({
  getPayMeSubscription: (...args: unknown[]) => getSubscription(...args),
  PayMeError: class PayMeError extends Error {},
}));

const BODY = "notify_type=sub-iteration-success&sub_payme_id=SUB-XYZ&sale_payme_id=SALE-1&price=3900";

function writes(table: string, ops: Call["op"][]): Call[] {
  return calls.filter((c) => c.table === table && ops.includes(c.op));
}

describe("processPayMeCallback — unverifiable callbacks change nothing", () => {
  beforeEach(() => {
    calls.length = 0;
    getSubscription.mockReset();
    subscriptionRow = SUBSCRIPTION_ROW;
  });

  it("PayMe rejects/cannot answer the read-back → no subscription change, no revenue, only a failed event", async () => {
    const { PayMeError } = await import("./client");
    getSubscription.mockRejectedValue(new PayMeError("PayMe rejected get-subscriptions: partner key required"));
    const { processPayMeCallback } = await import("./process-callback");

    const result = await processPayMeCallback(BODY);

    expect(result.outcome).toBe("failed");
    expect(result.httpStatus).toBe(503); // PayMe retries later
    expect(writes("business_subscriptions", ["insert", "update", "upsert"])).toEqual([]);
    expect(writes("billing_transactions", ["insert", "update", "upsert"])).toEqual([]);
    expect(writes("business_registrations", ["insert", "update", "upsert"])).toEqual([]);
    expect(writes("business_events_log", ["insert", "update", "upsert"])).toEqual([]);
    const failedUpdate = writes("billing_events", ["update"]).find((c) => (c.payload as { status?: string }).status === "failed");
    expect(failedUpdate).toBeDefined();
  });

  it("PayMe does not know the subscription (read-back returns nothing) → same: nothing changes", async () => {
    getSubscription.mockResolvedValue(null);
    const { processPayMeCallback } = await import("./process-callback");

    const result = await processPayMeCallback(BODY);

    expect(result.outcome).toBe("failed");
    expect(writes("business_subscriptions", ["insert", "update", "upsert"])).toEqual([]);
    expect(writes("billing_transactions", ["insert", "update", "upsert"])).toEqual([]);
    expect(writes("business_events_log", ["insert", "update", "upsert"])).toEqual([]);
  });

  it("a callback for a subscription we never created changes nothing and never even asks PayMe", async () => {
    subscriptionRow = null;
    const { processPayMeCallback } = await import("./process-callback");

    const result = await processPayMeCallback(BODY);

    expect(result.outcome).toBe("failed");
    expect(getSubscription).not.toHaveBeenCalled();
    expect(writes("business_subscriptions", ["insert", "update", "upsert"])).toEqual([]);
    expect(writes("billing_transactions", ["insert", "update", "upsert"])).toEqual([]);
  });

  it("a callback body without a subscription id is rejected outright", async () => {
    const { processPayMeCallback } = await import("./process-callback");
    const result = await processPayMeCallback("notify_type=sub-iteration-success");
    expect(result.httpStatus).toBe(400);
    expect(calls).toEqual([]);
  });
});

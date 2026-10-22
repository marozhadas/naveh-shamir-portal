import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin-client", () => ({ isSupabaseAdminConfigured: () => true, createAdminSupabaseClient: () => { throw new Error("the real database must not be used"); } }));

import { cancelSumitTrialForRejection, type SumitTrialCancelClient } from "./sumit-trial-cancellation";

const REGISTRATION_ID = "55555555-5555-5555-5555-555555555555";
const ADMIN = "admin-1";
const NOW = new Date("2026-10-23T09:00:00.000Z");

type Row = Record<string, unknown>;
type Table = "business_subscriptions" | "billing_transactions" | "business_events_log";

const state = {
  business_subscriptions: [] as Row[],
  billing_transactions: [] as Row[],
  business_events_log: [] as Row[],
  updateError: null as null | { message: string },
  readError: null as null | { message: string },
  /** Simulates a concurrent request that ended the row between our read and our write. */
  endedByAnotherRequest: false,
  updates: 0,
};

/** An in-memory stand-in for the database: filtered select / update (with .is(col, null)), insert, and a tick between steps. */
function from(table: Table) {
  const filters: Array<[string, unknown]> = [];
  let op: "select" | "insert" | "update" = "select";
  let payload: Row = {};
  const matching = () => state[table].filter((row) => filters.every(([column, value]) => row[column] === value));

  async function exec(): Promise<{ rows: Row[]; error: { message: string } | null }> {
    await Promise.resolve();
    if (op === "select") return { rows: state.readError && table === "business_subscriptions" ? [] : matching(), error: state.readError && table === "business_subscriptions" ? state.readError : null };
    if (op === "insert") {
      state[table].push({ ...payload });
      return { rows: [payload], error: null };
    }
    state.updates += 1;
    if (state.updateError) return { rows: [], error: state.updateError };
    if (state.endedByAnotherRequest) {
      for (const row of state.business_subscriptions) row.status = "canceled";
      return { rows: [], error: null };
    }
    const rows = matching();
    for (const row of rows) Object.assign(row, payload);
    return { rows, error: null };
  }

  const query = {
    select() {
      return query;
    },
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return query;
    },
    is(column: string, value: null) {
      filters.push([column, value]);
      return query;
    },
    limit() {
      return query;
    },
    insert(row: Row) {
      op = "insert";
      payload = row;
      return query;
    },
    update(row: Row) {
      op = "update";
      payload = row;
      return query;
    },
    async maybeSingle() {
      const { rows, error } = await exec();
      return { data: rows[0] ?? null, error };
    },
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return exec().then(({ rows, error }) => ({ data: rows, error }), undefined).then(resolve, reject);
    },
  };
  return query;
}

const admin = { from: (table: string) => from(table as Table) } as unknown as SumitTrialCancelClient;
const run = () => cancelSumitTrialForRejection(REGISTRATION_ID, ADMIN, { admin, now: () => NOW });
const sub = () => state.business_subscriptions[0];
const fetchMock = vi.fn();

const UNBILLED_SUMIT_TRIAL = (): Row => ({
  id: "sub-1",
  business_registration_id: REGISTRATION_ID,
  status: "trialing",
  payment_provider: "sumit",
  provider_subscription_id: null,
  provider_last_transaction_id: null,
  last_payment_succeeded_at: null,
  last_payment_failed_at: null,
  payment_failed_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  trial_ends_at: "2026-11-21T10:00:00.000Z",
  next_billing_at: "2026-11-21T10:00:00.000Z",
});

beforeEach(() => {
  state.business_subscriptions = [UNBILLED_SUMIT_TRIAL()];
  state.billing_transactions = [];
  state.business_events_log = [];
  state.updateError = null;
  state.readError = null;
  state.endedByAnotherRequest = false;
  state.updates = 0;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("rejecting a business with an unbilled SUMIT trial ends the trial", () => {
  it("marks the subscription canceled, clears the planned billing date, logs one event, and makes no network call", async () => {
    expect(await run()).toEqual({ success: true, outcome: "canceled" });
    expect(sub()).toMatchObject({ status: "canceled", cancel_at_period_end: false, canceled_at: NOW.toISOString(), next_billing_at: null, payment_provider: "sumit", provider_subscription_id: null });
    expect(state.business_events_log).toEqual([{ business_registration_id: REGISTRATION_ID, event_type: "subscription_canceled", actor_id: ADMIN, metadata: { provider: "sumit", initiatedBy: "admin-rejection", charged: false } }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("running it again is safe: the row is 'already-ended', nothing is written, no second event", async () => {
    await run();
    const ended = { ...sub() };
    const updatesBefore = state.updates;
    expect(await run()).toEqual({ success: true, outcome: "already-ended" });
    expect(sub()).toEqual(ended);
    expect(state.updates).toBe(updatesBefore);
    expect(state.business_events_log).toHaveLength(1);
  });

  it("an expired trial (the hourly job ended it) is also 'already-ended' and untouched", async () => {
    sub().status = "expired";
    expect(await run()).toEqual({ success: true, outcome: "already-ended" });
    expect(sub().status).toBe("expired");
    expect(state.updates).toBe(0);
  });

  it("another request ending the row between our read and write is fine - verified by reading it again", async () => {
    state.endedByAnotherRequest = true;
    expect(await run()).toEqual({ success: true, outcome: "already-ended" });
    expect(state.business_events_log).toEqual([]);
  });
});

describe("it never touches a SUMIT subscription that is not an unbilled trial", () => {
  it.each([
    ["has a provider subscription id", (row: Row) => { row.provider_subscription_id = "SUB-1"; }],
    ["has a last transaction id", (row: Row) => { row.provider_last_transaction_id = "900"; }],
    ["has a successful payment", (row: Row) => { row.last_payment_succeeded_at = "2026-11-21T10:00:00.000Z"; }],
    ["has a failed payment", (row: Row) => { row.last_payment_failed_at = "2026-11-21T10:00:00.000Z"; }],
    ["has a payment failure", (row: Row) => { row.payment_failed_at = "2026-11-21T10:00:00.000Z"; }],
    ["is active", (row: Row) => { row.status = "active"; }],
    ["is past due", (row: Row) => { row.status = "past-due"; }],
    ["is in a grace period", (row: Row) => { row.status = "grace-period"; }],
    ["is paused", (row: Row) => { row.status = "paused"; }],
  ])("a SUMIT row that %s is 'not-eligible' and left exactly as it is", async (_label, arrange) => {
    arrange(sub());
    const before = { ...sub() };
    expect(await run()).toEqual({ success: false, reason: "not-eligible" });
    expect(sub()).toEqual(before);
    expect(state.updates).toBe(0);
    expect(state.business_events_log).toEqual([]);
  });

  it("a business transaction (a charge) makes it 'not-eligible' even if the subscription row looks clean", async () => {
    state.billing_transactions = [{ id: "t-1", business_registration_id: REGISTRATION_ID }];
    expect(await run()).toEqual({ success: false, reason: "not-eligible" });
    expect(sub().status).toBe("trialing");
    expect(state.updates).toBe(0);
  });
});

describe("rows that are not this module's business are left alone", () => {
  it.each([
    ["no subscription", () => { state.business_subscriptions = []; }],
    ["a card-less trial (no provider)", () => { sub().payment_provider = null; }],
    ["a PayMe subscription (it has its own cancel path)", () => { sub().payment_provider = "payme"; sub().provider_subscription_id = "SUB-9"; }],
  ])("%s -> 'none', nothing changes", async (_label, arrange) => {
    arrange();
    const before = state.business_subscriptions.map((row) => ({ ...row }));
    expect(await run()).toEqual({ success: true, outcome: "none" });
    expect(state.business_subscriptions).toEqual(before);
    expect(state.updates).toBe(0);
  });
});

describe("failures are errors, never success", () => {
  it("a database error on the write is an error and the trial stays as it was", async () => {
    state.updateError = { message: "boom" };
    expect(await run()).toEqual({ success: false, reason: "unknown-error" });
    expect(sub().status).toBe("trialing");
    expect(state.business_events_log).toEqual([]);
  });

  it("an error reading the subscription is an error and nothing is written", async () => {
    state.readError = { message: "boom" };
    expect(await run()).toEqual({ success: false, reason: "unknown-error" });
    expect(state.updates).toBe(0);
  });

  it("a write that changed nothing while the row is still a live trial is an error, not success", async () => {
    // the row no longer matches the guard (someone gave it a provider id after our read): the update finds nothing and the row is not ended
    const original = state.business_subscriptions;
    const guarded = original[0];
    const realUpdate = state.updates;
    Object.defineProperty(guarded, "provider_subscription_id", { get: (() => { let reads = 0; return () => (reads++ === 0 ? null : "SUB-LATE"); })(), configurable: true });
    expect(await run()).toEqual({ success: false, reason: "unknown-error" });
    expect(guarded.status).toBe("trialing");
    expect(state.updates).toBe(realUpdate + 1);
  });
});

describe("this module cannot charge or call a provider", () => {
  it("imports no payment provider, SUMIT client or PayMe code, and has no network call", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const code = readFileSync(path.join(__dirname, "sumit-trial-cancellation.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const imports = [...code.matchAll(/from "([^"]+)"/g)].map((match) => match[1]);
    expect(imports.filter((specifier) => /sumit\/|payments\/|payme\/|payment-provider/.test(specifier))).toEqual([]);
    expect(code).not.toMatch(/\.charge\(|chargeSumit|removePaymentMethod|getPaymentProvider|fetch\(/);
  });
});

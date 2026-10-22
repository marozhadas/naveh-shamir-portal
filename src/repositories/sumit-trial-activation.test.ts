import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin-client", () => ({ isSupabaseAdminConfigured: () => true, createAdminSupabaseClient: () => { throw new Error("the real database must not be used"); } }));

import { activateSumitTrialOnApproval, type SumitTrialAdminClient } from "./sumit-trial-activation";

const REGISTRATION_ID = "55555555-5555-5555-5555-555555555555";
const OWNER = "owner-uuid-1";
const ADMIN = "admin-1";
const NOW = new Date("2026-10-22T10:00:00.000Z");

type Row = Record<string, unknown>;
type Table = "business_registrations" | "business_subscriptions" | "billing_payment_methods" | "business_events_log";

const state = {
  business_registrations: [] as Row[],
  business_subscriptions: [] as Row[],
  billing_payment_methods: [] as Row[],
  business_events_log: [] as Row[],
  users: new Set<string>(),
  insertError: null as null | { code: string; message: string },
  approveError: null as null | { message: string },
  approveMatchesNothing: false,
  selects: [] as Array<{ table: string; columns: string }>,
  nextId: 1,
};

/** An in-memory stand-in for the database that behaves like it where it matters here: UNIQUE(business_registration_id) on subscriptions, filtered updates, and a tick between steps so two concurrent calls really interleave. */
function from(table: Table) {
  const filters: Array<[string, unknown]> = [];
  let op: "select" | "insert" | "update" | "delete" = "select";
  let payload: Row = {};
  const matching = () => state[table].filter((row) => filters.every(([column, value]) => row[column] === value));

  async function exec(): Promise<{ rows: Row[]; error: { code?: string; message: string } | null }> {
    await Promise.resolve();
    await Promise.resolve();
    if (op === "select") return { rows: matching(), error: null };
    if (op === "insert") {
      if (table === "business_subscriptions") {
        if (state.insertError) return { rows: [], error: state.insertError };
        if (state.business_subscriptions.some((row) => row.business_registration_id === payload.business_registration_id)) return { rows: [], error: { code: "23505", message: "duplicate key value violates unique constraint" } };
      }
      const row = { id: `${table}-${state.nextId++}`, created_at: NOW.toISOString(), updated_at: NOW.toISOString(), ...payload };
      state[table].push(row);
      return { rows: [row], error: null };
    }
    if (op === "update") {
      if (table === "business_registrations" && state.approveError) return { rows: [], error: state.approveError };
      if (table === "business_registrations" && state.approveMatchesNothing) return { rows: [], error: null };
      const rows = matching();
      for (const row of rows) Object.assign(row, payload);
      return { rows, error: null };
    }
    const doomed = matching();
    state[table] = state[table].filter((row) => !doomed.includes(row));
    return { rows: doomed, error: null };
  }

  const query = {
    select(columns?: string) {
      if (op === "select") state.selects.push({ table, columns: columns ?? "*" });
      return query;
    },
    eq(column: string, value: unknown) {
      filters.push([column, value]);
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
    delete() {
      op = "delete";
      return query;
    },
    async maybeSingle() {
      const { rows, error } = await exec();
      return { data: rows[0] ?? null, error };
    },
    async single() {
      const { rows, error } = await exec();
      return { data: rows[0] ?? null, error };
    },
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return exec().then(({ rows, error }) => ({ data: rows, error }), undefined).then(resolve, reject);
    },
  };
  return query;
}

const admin = {
  from: (table: string) => from(table as Table),
  auth: { admin: { getUserById: async (id: string) => ({ data: state.users.has(id) ? { user: { id } } : { user: null }, error: null }) } },
} as unknown as SumitTrialAdminClient;

const run = (overrides: { adminId?: string } = {}) => activateSumitTrialOnApproval(REGISTRATION_ID, overrides.adminId ?? ADMIN, { admin, now: () => NOW });
const registration = () => state.business_registrations[0];
const subscriptions = () => state.business_subscriptions;
const fetchMock = vi.fn();

beforeEach(() => {
  state.business_registrations = [{ id: REGISTRATION_ID, status: "pending", slug: "noa-studio", owner_id: OWNER, plan_tier: "plus", selected_billing_interval: "monthly", offer_code: "launch_standard", active_plan_id: "basic", reviewed_at: null, rejection_reason: null }];
  state.business_subscriptions = [];
  state.billing_payment_methods = [{ business_registration_id: REGISTRATION_ID, owner_id: OWNER, provider: "sumit", provider_token: null, provider_customer_id: "7000000001", provider_payment_method_id: "7000000002", card_mask: "XXXXXXXXXXXX0772" }];
  state.business_events_log = [];
  state.users = new Set([OWNER]);
  state.insertError = null;
  state.approveError = null;
  state.approveMatchesNothing = false;
  state.selects = [];
  state.nextId = 1;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("approving a registration with a saved SUMIT card", () => {
  it("starts a 30-day trial from the approval, with no provider subscription, and approves + publishes the business", async () => {
    const result = await run();
    expect(result).toMatchObject({ success: true, offerCode: "launch_standard", trialDays: 30, nextBillingAt: "2026-11-21T10:00:00.000Z" });

    expect(subscriptions()).toHaveLength(1);
    expect(subscriptions()[0]).toMatchObject({
      business_registration_id: REGISTRATION_ID,
      owner_id: OWNER,
      plan_id: "plus",
      status: "trialing",
      trial_started_at: "2026-10-22T10:00:00.000Z",
      trial_ends_at: "2026-11-21T10:00:00.000Z",
      next_billing_at: "2026-11-21T10:00:00.000Z", // = the end of the trial: a PLANNED date, nothing reads it to charge
      offer_code: "launch_standard",
      trial_days: 30,
      billing_interval: "monthly",
      cancel_at_period_end: false,
      payment_provider: "sumit",
      provider_subscription_id: null,
    });
    expect(registration()).toMatchObject({ status: "approved", active_plan_id: "plus", reviewed_at: NOW.toISOString(), rejection_reason: null });
  });

  it("the trial length is the existing policy: it comes from the offer on the business (Pilot = 90 days), counted from the approval", async () => {
    registration().offer_code = "pilot_2026";
    const result = await run();
    expect(result).toMatchObject({ success: true, offerCode: "pilot_2026", trialDays: 90, nextBillingAt: "2027-01-20T10:00:00.000Z" });
    expect(subscriptions()[0]).toMatchObject({ trial_days: 90, trial_ends_at: "2027-01-20T10:00:00.000Z", next_billing_at: "2027-01-20T10:00:00.000Z" });
  });

  it("a yearly plan keeps its price snapshot; the first planned billing is still the end of the trial", async () => {
    registration().selected_billing_interval = "yearly";
    registration().plan_tier = "premium";
    expect(await run()).toMatchObject({ success: true });
    expect(subscriptions()[0]).toMatchObject({ plan_id: "premium", billing_interval: "yearly", next_billing_at: "2026-11-21T10:00:00.000Z" });
    expect(registration()).toMatchObject({ status: "approved", active_plan_id: "premium" }); // the live plan follows the chosen tier, in the same update as the approval
    expect(Number(subscriptions()[0].price_amount_ils)).toBeGreaterThan(0);
  });

  it("NO call to any payment provider or any other network endpoint is made", async () => {
    await run();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the card is recognised by provider = sumit and its customer id - the token column is never read", async () => {
    await run();
    expect(state.selects.some((entry) => /provider_token|buyer_key/.test(entry.columns))).toBe(false);
    expect(state.selects.find((entry) => entry.table === "billing_payment_methods")?.columns).toBe("provider_customer_id");
  });

  it("writes a trial_started event that says billing is NOT connected - no token, no card, no customer id", async () => {
    await run();
    expect(state.business_events_log).toHaveLength(1);
    expect(state.business_events_log[0]).toMatchObject({ business_registration_id: REGISTRATION_ID, event_type: "trial_started", actor_id: ADMIN });
    const metadata = state.business_events_log[0].metadata as Record<string, unknown>;
    expect(metadata).toMatchObject({ provider: "sumit", billingConnected: false, trialDays: 30, offerCode: "launch_standard", activatedByAdminApproval: true });
    expect(JSON.stringify(metadata)).not.toMatch(/7000000001|7000000002|0772|token/i);
  });
});

describe("it cannot create a second subscription or reset the trial", () => {
  it("approving again later: the business is no longer pending, nothing is written, the trial dates are untouched", async () => {
    await run();
    const first = { ...subscriptions()[0] };
    const eventsBefore = state.business_events_log.length;

    const later = await activateSumitTrialOnApproval(REGISTRATION_ID, ADMIN, { admin, now: () => new Date("2026-11-05T10:00:00.000Z") });
    expect(later).toEqual({ success: false, reason: "not-pending" });
    expect(subscriptions()).toHaveLength(1);
    expect(subscriptions()[0]).toEqual(first);
    expect(state.business_events_log).toHaveLength(eventsBefore);
  });

  it("two approvals at the same time: exactly one subscription, one winner, the loser changes nothing", async () => {
    const [a, b] = await Promise.all([run(), activateSumitTrialOnApproval(REGISTRATION_ID, "admin-2", { admin, now: () => new Date("2026-10-22T10:00:05.000Z") })]);
    const outcomes = [a, b];
    expect(outcomes.filter((outcome) => outcome.success)).toHaveLength(1);
    expect(outcomes.filter((outcome) => !outcome.success)).toEqual([{ success: false, reason: "already-exists" }]);

    expect(subscriptions()).toHaveLength(1);
    const winner = outcomes.findIndex((outcome) => outcome.success);
    expect(subscriptions()[0].trial_started_at).toBe(winner === 0 ? "2026-10-22T10:00:00.000Z" : "2026-10-22T10:00:05.000Z"); // the winner's trial, not reset by the loser
    expect(registration().status).toBe("approved");
    expect(state.business_events_log.filter((event) => event.event_type === "trial_started")).toHaveLength(1);
  });

  it("a subscription that already exists blocks the activation before anything is written", async () => {
    state.business_subscriptions = [{ id: "sub-existing", business_registration_id: REGISTRATION_ID, status: "trialing", trial_started_at: "2026-09-01T00:00:00.000Z" }];
    expect(await run()).toEqual({ success: false, reason: "already-exists" });
    expect(subscriptions()).toHaveLength(1);
    expect(subscriptions()[0].trial_started_at).toBe("2026-09-01T00:00:00.000Z");
    expect(registration().status).toBe("pending");
  });
});

describe("nothing is created unless everything is valid", () => {
  it.each([
    ["no SUMIT card", () => { state.billing_payment_methods = []; }, "no-payment-method"],
    ["only a PayMe card (a token is not a SUMIT card)", () => { state.billing_payment_methods = [{ business_registration_id: REGISTRATION_ID, provider: "payme", provider_token: "buyer-key-abcdef", provider_customer_id: null }]; }, "no-payment-method"],
    ["a SUMIT row without a customer id", () => { state.billing_payment_methods[0].provider_customer_id = null; }, "no-payment-method"],
    ["a SUMIT row with a malformed customer id", () => { state.billing_payment_methods[0].provider_customer_id = "12ab"; }, "no-payment-method"],
    ["a business that does not exist", () => { state.business_registrations = []; }, "not-found"],
    ["an approved business", () => { registration().status = "approved"; }, "not-pending"],
    ["a rejected business", () => { registration().status = "rejected"; }, "not-pending"],
    ["no owner", () => { registration().owner_id = null; }, "no-owner"],
    ["an owner who no longer exists", () => { state.users = new Set(); }, "no-owner"],
    ["a slug that is not a clean English one", () => { registration().slug = "עסק-בדיקה"; }, "invalid-slug"],
    ["a free plan", () => { registration().plan_tier = "free"; }, "invalid-plan"],
    ["an unknown offer", () => { registration().offer_code = "made_up"; }, "invalid-plan"],
    ["an unknown billing track", () => { registration().selected_billing_interval = "weekly"; }, "invalid-plan"],
  ])("%s: %s -> %s, no subscription, the business stays pending", async (_label, arrange, reason) => {
    arrange();
    expect(await run()).toEqual({ success: false, reason });
    expect(subscriptions()).toEqual([]);
    expect(state.business_events_log).toEqual([]);
    if (state.business_registrations[0]) expect(registration().status).toBe(_label === "an approved business" ? "approved" : _label === "a rejected business" ? "rejected" : "pending");
  });

  it("a database failure while writing the subscription is an error and nothing is approved", async () => {
    state.insertError = { code: "XX000", message: "boom" };
    expect(await run()).toEqual({ success: false, reason: "unknown-error" });
    expect(subscriptions()).toEqual([]);
    expect(registration().status).toBe("pending");
  });
});

describe("a half-approved business is never left behind", () => {
  it("if approving the business fails after the subscription row was written, that row is removed again", async () => {
    state.approveError = { message: "boom" };
    expect(await run()).toEqual({ success: false, reason: "approve-failed" });
    expect(subscriptions()).toEqual([]);
    expect(registration().status).toBe("pending");
    expect(state.business_events_log).toEqual([]);
  });

  it("if the business is no longer pending at that moment (the approve matched nothing), the row is removed as well", async () => {
    state.approveMatchesNothing = true;
    expect(await run()).toEqual({ success: false, reason: "approve-failed" });
    expect(subscriptions()).toEqual([]);
  });
});

describe("this module cannot charge", () => {
  it("imports no payment provider, no SUMIT client and no PayMe code, and never mentions a charge call", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const source = readFileSync(path.join(__dirname, "sumit-trial-activation.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const imports = [...code.matchAll(/from "([^"]+)"/g)].map((match) => match[1]);
    expect(imports.filter((specifier) => /sumit\/|payments\/|payme\/(client|flow|config)|payment-provider/.test(specifier))).toEqual([]);
    expect(code).not.toMatch(/\.charge\(|chargeSumit|savePaymentMethod|getPaymentProvider|fetch\(/);
  });
});

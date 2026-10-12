import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";
const USER = "user-1";

const calls: { table: string; select?: string; filters: Record<string, unknown> }[] = [];
const writes: string[] = [];
const db = {
  registrations: [] as Record<string, unknown>[],
  cards: [] as Record<string, unknown>[],
  subscriptions: [] as Record<string, unknown>[],
};

function from(table: string) {
  const call: { table: string; select?: string; filters: Record<string, unknown> } = { table, filters: {} };
  calls.push(call);
  const result = () => {
    if (table === "business_registrations") return db.registrations.filter((row) => (call.filters.owner_id === undefined || row.owner_id === call.filters.owner_id) && (call.filters.status === undefined || row.status === call.filters.status));
    if (table === "billing_payment_methods") return db.cards;
    return db.subscriptions;
  };
  const q: Record<string, unknown> = {
    select(columns: string) {
      call.select = columns;
      return q;
    },
    eq(column: string, value: unknown) {
      call.filters[column] = value;
      return q;
    },
    in: () => q,
    order: () => q,
    limit: async () => ({ data: result(), error: null }),
    then: (resolve: (value: unknown) => void) => resolve({ data: result(), error: null }),
    insert: () => writes.push("insert"),
    update: () => writes.push("update"),
    upsert: () => writes.push("upsert"),
    delete: () => writes.push("delete"),
  };
  return q;
}
vi.mock("@/lib/supabase/admin-client", () => ({ isSupabaseAdminConfigured: () => true, createAdminSupabaseClient: () => ({ from }) }));
vi.mock("@/lib/payme/flow-access", () => ({ getPayMeConfigForBusiness: async () => null, getPayMeConfigForRegistrant: async () => null }));
vi.mock("@/lib/payme/client", () => ({ generatePayMeSubscription: vi.fn(), cancelPayMeSubscription: vi.fn(), parsePayMeDateTime: () => null }));

const reg = (overrides: Record<string, unknown> = {}) => ({
  id: "reg-1",
  owner_id: USER,
  status: "pending",
  plan_tier: "plus",
  selected_billing_interval: "monthly",
  offer_code: "launch_standard",
  business_name: "סטודיו נועה",
  created_at: "2026-10-11T10:00:00.000Z",
  ...overrides,
});

describe("findRegistrationAwaitingPaymentMethod", () => {
  beforeEach(() => {
    calls.length = 0;
    writes.length = 0;
    db.registrations = [reg()];
    db.cards = [];
    db.subscriptions = [];
  });

  async function find(ownerId = USER) {
    const { findRegistrationAwaitingPaymentMethod } = await import("./supabase-subscription-service");
    return findRegistrationAwaitingPaymentMethod(ownerId);
  }

  it("1. finds the owner's paid pending registration with no card and no subscription", async () => {
    expect(await find()).toEqual({ registrationId: "reg-1", planTier: "plus", billingInterval: "monthly", businessName: "סטודיו נועה" });
  });

  it("6. only asks for the signed-in user's own registrations - another user's is never returned", async () => {
    db.registrations = [reg({ owner_id: "someone-else" })];
    expect(await find()).toBeNull();
    expect(calls.find((call) => call.table === "business_registrations")?.filters).toMatchObject({ owner_id: USER, status: "pending" });
  });

  it("7. a registration that already has a saved payment method is not offered", async () => {
    db.cards = [{ business_registration_id: "reg-1" }];
    expect(await find()).toBeNull();
  });

  it("a registration that already has a subscription is not offered", async () => {
    db.subscriptions = [{ business_registration_id: "reg-1" }];
    expect(await find()).toBeNull();
  });

  it("8. an approved business is not offered (only pending ones are even read)", async () => {
    db.registrations = [reg({ status: "approved" })];
    expect(await find()).toBeNull();
  });

  it("9. a free registration is not offered", async () => {
    db.registrations = [reg({ plan_tier: "free" })];
    expect(await find()).toBeNull();
  });

  it("5. looking (and so a refresh) writes nothing - no registration, card, subscription or trial is created", async () => {
    await find();
    await find();
    expect(writes).toEqual([]);
  });

  it("asks the card and subscription tables for registration ids only - never the buyer_key", async () => {
    db.cards = [{ business_registration_id: "other", provider_token: TOKEN }];
    const result = await find();
    expect(calls.find((call) => call.table === "billing_payment_methods")?.select).toBe("business_registration_id");
    expect(calls.find((call) => call.table === "business_subscriptions")?.select).toBe("business_registration_id");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });
});

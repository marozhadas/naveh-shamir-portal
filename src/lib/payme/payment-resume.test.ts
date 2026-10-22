import { describe, expect, it } from "vitest";
import { pickRegistrationAwaitingPayment, pickRegistrationWithSavedPaymentMethod, type PaymentResumeCandidate } from "./payment-resume";

const USER = "user-1";
const NOW = new Date("2026-10-12T10:00:00.000Z");
const row = (overrides: Partial<PaymentResumeCandidate> = {}): PaymentResumeCandidate => ({
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
const none = new Set<string>();
const pick = (rows: PaymentResumeCandidate[], cards = none, subscriptions = none) => pickRegistrationAwaitingPayment(rows, USER, cards, subscriptions, NOW);

describe("pickRegistrationAwaitingPayment - who is offered 'complete the payment method'", () => {
  it("1. a paid, pending registration of this user with no saved payment method and no subscription is offered", () => {
    expect(pick([row()])).toEqual({ registrationId: "reg-1", planTier: "plus", billingInterval: "monthly", businessName: "סטודיו נועה" });
    expect(pick([row({ plan_tier: "premium", selected_billing_interval: "yearly" })])).toMatchObject({ planTier: "premium", billingInterval: "yearly" });
  });

  it("6. another user's registration is never offered", () => {
    expect(pick([row({ owner_id: "someone-else" })])).toBeNull();
    expect(pick([row({ owner_id: null })])).toBeNull();
  });

  it("7. a registration that already has a saved payment method is not offered", () => {
    expect(pick([row()], new Set(["reg-1"]))).toBeNull();
  });

  it("a registration that already has a subscription is not offered", () => {
    expect(pick([row()], none, new Set(["reg-1"]))).toBeNull();
  });

  it("8. an approved (or rejected / suspended) business is not offered", () => {
    for (const status of ["approved", "rejected", "suspended", "archived"]) expect(pick([row({ status })])).toBeNull();
  });

  it("9. a free registration is not offered", () => {
    expect(pick([row({ plan_tier: "free" })])).toBeNull();
  });

  it("a plan that could never be billed (unknown track or offer) is not offered", () => {
    expect(pick([row({ selected_billing_interval: "weekly" })])).toBeNull();
    expect(pick([row({ offer_code: "made_up" })])).toBeNull();
    expect(pick([row({ offer_code: null })])).toBeNull();
  });

  it("with several candidates the newest eligible one is offered - a registration that is done is skipped", () => {
    const older = row({ id: "reg-old", created_at: "2026-10-01T10:00:00.000Z" });
    const newest = row({ id: "reg-new", created_at: "2026-10-11T10:00:00.000Z" });
    expect(pick([older, newest])?.registrationId).toBe("reg-new");
    expect(pick([older, newest], new Set(["reg-new"]))?.registrationId).toBe("reg-old");
  });

  it("returns only ids, names and the plan - nothing about a card", () => {
    const offered = pick([{ ...row(), provider_token: "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP" } as never]);
    expect(Object.keys(offered ?? {}).sort()).toEqual(["billingInterval", "businessName", "planTier", "registrationId"]);
  });
});

describe("pickRegistrationWithSavedPaymentMethod - who is shown 'the card is saved'", () => {
  const saved = (rows: PaymentResumeCandidate[], cards = new Set(["reg-1"]), subscriptions = none) => pickRegistrationWithSavedPaymentMethod(rows, USER, cards, subscriptions, NOW);

  it("a paid, pending registration of this user WITH a saved payment method and no subscription is found - the opposite of 'awaiting'", () => {
    expect(saved([row()])).toEqual({ registrationId: "reg-1", planTier: "plus", billingInterval: "monthly", businessName: "סטודיו נועה" });
    expect(pick([row()], new Set(["reg-1"]))).toBeNull();
  });

  it("nothing is found without a saved card, with a subscription, for another user, or when the registration is not pending / not paid / not billable", () => {
    expect(saved([row()], none)).toBeNull();
    expect(saved([row()], new Set(["reg-1"]), new Set(["reg-1"]))).toBeNull();
    expect(saved([row({ owner_id: "someone-else" })])).toBeNull();
    for (const status of ["approved", "rejected", "suspended"]) expect(saved([row({ status })]), status).toBeNull();
    expect(saved([row({ plan_tier: "free" })])).toBeNull();
    expect(saved([row({ offer_code: "unknown-offer" })])).toBeNull();
  });

  it("returns only ids and the business name (no card data exists in the input)", () => {
    expect(Object.keys(saved([row()])!).sort()).toEqual(["billingInterval", "businessName", "planTier", "registrationId"]);
  });
});

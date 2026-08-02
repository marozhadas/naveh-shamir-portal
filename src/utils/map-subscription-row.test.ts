import { describe, expect, it } from "vitest";
import { mapSubscriptionRowToBusinessSubscription } from "./map-subscription-row";
import type { BusinessSubscriptionRow } from "@/types/subscription";

function makeRow(overrides: Partial<BusinessSubscriptionRow> = {}): BusinessSubscriptionRow {
  return {
    id: "sub-uuid-1",
    business_registration_id: "11111111-1111-1111-1111-111111111111",
    owner_id: "owner-uuid-1",
    plan_id: "business-monthly",
    status: "trialing",
    trial_started_at: "2026-06-01T00:00:00.000Z",
    trial_ends_at: "2026-07-01T00:00:00.000Z",
    current_period_started_at: null,
    current_period_ends_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapSubscriptionRowToBusinessSubscription", () => {
  it("prefixes the businessId with reg- so it routes as a Supabase-backed id downstream", () => {
    const subscription = mapSubscriptionRowToBusinessSubscription(makeRow());
    expect(subscription.businessId).toBe("reg-11111111-1111-1111-1111-111111111111");
  });

  it("carries status, plan, and owner through unchanged", () => {
    const subscription = mapSubscriptionRowToBusinessSubscription(makeRow({ status: "active", owner_id: "owner-2" }));
    expect(subscription.status).toBe("active");
    expect(subscription.ownerId).toBe("owner-2");
    expect(subscription.planId).toBe("business-monthly");
  });

  it("converts null optional period/cancellation fields to undefined, not null", () => {
    const subscription = mapSubscriptionRowToBusinessSubscription(makeRow());
    expect(subscription.currentPeriodStartedAt).toBeUndefined();
    expect(subscription.currentPeriodEndsAt).toBeUndefined();
    expect(subscription.canceledAt).toBeUndefined();
  });

  it("keeps non-null period/cancellation fields as-is", () => {
    const subscription = mapSubscriptionRowToBusinessSubscription(
      makeRow({ current_period_started_at: "2026-07-01T00:00:00.000Z", current_period_ends_at: "2026-08-01T00:00:00.000Z" }),
    );
    expect(subscription.currentPeriodStartedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(subscription.currentPeriodEndsAt).toBe("2026-08-01T00:00:00.000Z");
  });
});

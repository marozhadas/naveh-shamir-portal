import { describe, expect, it } from "vitest";
import { startBusinessTrial } from "./start-business-trial";

describe("startBusinessTrial", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");
  const subscription = startBusinessTrial("biz-1", "owner-1", now);

  it("sets status to trialing", () => {
    expect(subscription.status).toBe("trialing");
  });

  it("starts the trial at `now`", () => {
    expect(subscription.trialStartedAt).toBe(now.toISOString());
  });

  it("ends the trial exactly 30 days later, not a calendar month", () => {
    expect(subscription.trialEndsAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("links the subscription to the given business and owner", () => {
    expect(subscription.businessId).toBe("biz-1");
    expect(subscription.ownerId).toBe("owner-1");
  });

  it("does not cancel at period end by default", () => {
    expect(subscription.cancelAtPeriodEnd).toBe(false);
  });

  it("marks the payment provider as mock", () => {
    expect(subscription.paymentProvider).toBe("mock");
  });
});

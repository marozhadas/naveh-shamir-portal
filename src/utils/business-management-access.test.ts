import { describe, expect, it } from "vitest";
import { checkBusinessManagementEligibility } from "./business-management-access";

function base(overrides: Partial<Parameters<typeof checkBusinessManagementEligibility>[0]> = {}) {
  return {
    status: "approved" as const,
    active_plan_id: "premium" as const,
    dashboard_access_consent: true,
    ...overrides,
  };
}

describe("checkBusinessManagementEligibility", () => {
  it("is eligible when approved, active-premium, and consented", () => {
    expect(checkBusinessManagementEligibility(base())).toEqual({ eligible: true });
  });

  it("rejects a pending registration", () => {
    expect(checkBusinessManagementEligibility(base({ status: "pending" }))).toEqual({ eligible: false, reason: "not-approved" });
  });

  it("rejects a rejected registration", () => {
    expect(checkBusinessManagementEligibility(base({ status: "rejected" }))).toEqual({ eligible: false, reason: "not-approved" });
  });

  it("rejects a non-premium active plan (basic)", () => {
    expect(checkBusinessManagementEligibility(base({ active_plan_id: "basic" }))).toEqual({ eligible: false, reason: "not-premium" });
  });

  it("rejects a non-premium active plan (plus)", () => {
    expect(checkBusinessManagementEligibility(base({ active_plan_id: "plus" }))).toEqual({ eligible: false, reason: "not-premium" });
  });

  it("rejects missing consent even when approved and premium", () => {
    expect(checkBusinessManagementEligibility(base({ dashboard_access_consent: false }))).toEqual({ eligible: false, reason: "no-consent" });
  });

  it("checks approval before plan, and plan before consent", () => {
    expect(checkBusinessManagementEligibility(base({ status: "pending", active_plan_id: "basic", dashboard_access_consent: false }))).toEqual({
      eligible: false,
      reason: "not-approved",
    });
    expect(checkBusinessManagementEligibility(base({ active_plan_id: "basic", dashboard_access_consent: false }))).toEqual({
      eligible: false,
      reason: "not-premium",
    });
  });
});

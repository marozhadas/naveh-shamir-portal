import { describe, expect, it } from "vitest";
import { getAdminTrialStatusLabel } from "./admin-trial-status";

describe("the admin's trial-status line", () => {
  it("a SUMIT trial in progress shows 'active (in trial)' even though the registration column still says not-started", () => {
    expect(getAdminTrialStatusLabel("not-started", { payment_provider: "sumit", status: "trialing" })).toBe("פעיל (בתקופת ניסיון)");
  });

  it("a SUMIT subscription whose trial is over (canceled, expired, or moved on) shows 'ended'", () => {
    for (const status of ["canceled", "expired", "active", "past-due", "grace-period", "paused"]) {
      expect(getAdminTrialStatusLabel("not-started", { payment_provider: "sumit", status }), status).toBe("הסתיים");
    }
  });

  it("the earlier paths are unchanged: no subscription, a card-less trial and a PayMe subscription show the registration column", () => {
    expect(getAdminTrialStatusLabel("not-started", null)).toBe("טרם הופעל");
    expect(getAdminTrialStatusLabel("active", null)).toBe("פעיל");
    expect(getAdminTrialStatusLabel("ended", null)).toBe("הסתיים");
    expect(getAdminTrialStatusLabel("not-started", { payment_provider: null, status: "trialing" })).toBe("טרם הופעל");
    expect(getAdminTrialStatusLabel("not-started", { payment_provider: "payme", status: "trialing" })).toBe("טרם הופעל");
    expect(getAdminTrialStatusLabel("something-new", null)).toBe("something-new");
  });
});

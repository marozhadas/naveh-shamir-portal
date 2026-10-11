import { describe, expect, it } from "vitest";
import { decideApprovalPath } from "./decide-registration-approval";

describe("decideApprovalPath", () => {
  it("a paid business with a saved card: approval activates (sandbox or live)", () => {
    expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: true, paymeEnv: "sandbox" })).toBe("activate");
    expect(decideApprovalPath({ planTier: "premium", hasPaymentMethod: true, paymeEnv: "live" })).toBe("activate");
  });

  it("a saved card but PayMe not configured: blocked", () => {
    expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: true, paymeEnv: null })).toBe("blocked-payme-not-configured");
  });

  it("no card: blocked only when PayMe is live; otherwise the earlier approve-only behaviour", () => {
    expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: false, paymeEnv: "live" })).toBe("blocked-no-payment-method");
    expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: false, paymeEnv: "sandbox" })).toBe("approve-only");
    expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: false, paymeEnv: null })).toBe("approve-only");
  });

  it("a free registration is never touched by payment rules", () => {
    for (const env of ["live", "sandbox", null] as const) {
      expect(decideApprovalPath({ planTier: "free", hasPaymentMethod: false, paymeEnv: env })).toBe("approve-only");
      expect(decideApprovalPath({ planTier: "free", hasPaymentMethod: true, paymeEnv: env })).toBe("approve-only");
    }
  });
});

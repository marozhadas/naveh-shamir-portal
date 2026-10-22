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

  it("a saved SUMIT card starts a trial-only activation, whatever PayMe's state is", () => {
    for (const env of ["live", "sandbox", null] as const) {
      expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: true, paymeEnv: env, paymentMethodProvider: "sumit" })).toBe("activate-sumit-trial");
      expect(decideApprovalPath({ planTier: "premium", hasPaymentMethod: true, paymeEnv: env, paymentMethodProvider: "sumit" })).toBe("activate-sumit-trial");
    }
  });

  it("an explicit PayMe card keeps the PayMe rules; no card never becomes a SUMIT activation", () => {
    expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: true, paymeEnv: "sandbox", paymentMethodProvider: "payme" })).toBe("activate");
    expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: true, paymeEnv: null, paymentMethodProvider: "payme" })).toBe("blocked-payme-not-configured");
    for (const provider of ["sumit", "payme", null] as const) {
      expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: false, paymeEnv: "live", paymentMethodProvider: provider })).toBe("blocked-no-payment-method");
      expect(decideApprovalPath({ planTier: "plus", hasPaymentMethod: false, paymeEnv: null, paymentMethodProvider: provider })).toBe("approve-only");
    }
  });

  it("a free registration is never touched by payment rules", () => {
    expect(decideApprovalPath({ planTier: "free", hasPaymentMethod: true, paymeEnv: "live", paymentMethodProvider: "sumit" })).toBe("approve-only");
    for (const env of ["live", "sandbox", null] as const) {
      expect(decideApprovalPath({ planTier: "free", hasPaymentMethod: false, paymeEnv: env })).toBe("approve-only");
      expect(decideApprovalPath({ planTier: "free", hasPaymentMethod: true, paymeEnv: env })).toBe("approve-only");
    }
  });
});

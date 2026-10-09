import { describe, expect, it } from "vitest";
import { parsePayMeCallbackBody } from "./payme-helpers";
import { verifyCallbackAgainstLocal } from "./verify-callback";

const SELLER = "MPL-TEST-SELLER";
const local = { providerSubscriptionId: "SUB-REAL-1", businessRegistrationId: "reg-1" };
const callback = (fields: Record<string, string>) => parsePayMeCallbackBody(new URLSearchParams(fields).toString());
const base = { notify_type: "sub-active", sub_payme_id: "SUB-REAL-1", seller_payme_id: SELLER, subscription_id: "reg-1" };

describe("verifyCallbackAgainstLocal", () => {
  it("accepts a callback that names our seller and exactly the subscription we stored", () => {
    expect(verifyCallbackAgainstLocal({ callback: callback(base), configuredSellerId: SELLER, local })).toEqual({ ok: true });
  });

  it("accepts it when our own subscription_id is not echoed at all", () => {
    const { subscription_id: _omitted, ...withoutOurId } = base;
    void _omitted;
    expect(verifyCallbackAgainstLocal({ callback: callback(withoutOurId), configuredSellerId: SELLER, local })).toEqual({ ok: true });
  });

  it("rejects a subscription we do not know", () => {
    expect(verifyCallbackAgainstLocal({ callback: callback(base), configuredSellerId: SELLER, local: null })).toEqual({ ok: false, reason: "unknown-subscription" });
    expect(verifyCallbackAgainstLocal({ callback: callback(base), configuredSellerId: SELLER, local: { ...local, providerSubscriptionId: null } })).toEqual({ ok: false, reason: "unknown-subscription" });
  });

  it("rejects a missing or different seller id", () => {
    const { seller_payme_id: _omitted, ...withoutSeller } = base;
    void _omitted;
    expect(verifyCallbackAgainstLocal({ callback: callback(withoutSeller), configuredSellerId: SELLER, local })).toEqual({ ok: false, reason: "seller-id-missing" });
    expect(verifyCallbackAgainstLocal({ callback: callback({ ...base, seller_payme_id: "MPL-OTHER" }), configuredSellerId: SELLER, local })).toEqual({ ok: false, reason: "seller-mismatch" });
    expect(verifyCallbackAgainstLocal({ callback: callback(base), configuredSellerId: "", local })).toEqual({ ok: false, reason: "seller-mismatch" });
  });

  it("requires the PayMe subscription id to equal the stored one EXACTLY (no prefix, case or whitespace tolerance)", () => {
    for (const variant of ["SUB-REAL-2", "sub-real-1", "SUB-REAL-1 ", "SUB-REAL-"]) {
      const result = verifyCallbackAgainstLocal({ callback: callback({ ...base, sub_payme_id: variant }), configuredSellerId: SELLER, local });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects an echoed subscription_id that belongs to a different business", () => {
    expect(verifyCallbackAgainstLocal({ callback: callback({ ...base, subscription_id: "reg-2" }), configuredSellerId: SELLER, local })).toEqual({ ok: false, reason: "merchant-id-mismatch" });
  });
});

import { describe, expect, it } from "vitest";
import { decideOfferChange } from "./decide-offer-change";

describe("decideOfferChange", () => {
  it("lets an admin mark a business as pilot before any trial exists", () => {
    expect(decideOfferChange({ currentOffer: "launch_standard", requestedOffer: "pilot_2026", hasSubscription: false })).toEqual({
      ok: true,
      changed: true,
      auditAction: "business-pilot-assigned",
    });
  });

  it("lets an admin remove the pilot before any trial exists", () => {
    expect(decideOfferChange({ currentOffer: "pilot_2026", requestedOffer: "launch_standard", hasSubscription: false })).toEqual({
      ok: true,
      changed: true,
      auditAction: "business-pilot-removed",
    });
  });

  it("is a no-op (and never an error) when the offer is unchanged", () => {
    expect(decideOfferChange({ currentOffer: "pilot_2026", requestedOffer: "pilot_2026", hasSubscription: true })).toEqual({ ok: true, changed: false });
  });

  it("refuses any change once a subscription exists — the trial's offer is frozen", () => {
    expect(decideOfferChange({ currentOffer: "launch_standard", requestedOffer: "pilot_2026", hasSubscription: true })).toEqual({
      ok: false,
      reason: "subscription-exists",
    });
    expect(decideOfferChange({ currentOffer: "pilot_2026", requestedOffer: "launch_standard", hasSubscription: true })).toEqual({
      ok: false,
      reason: "subscription-exists",
    });
  });
});

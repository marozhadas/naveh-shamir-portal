import { describe, expect, it } from "vitest";
import { changeBusinessOfferSchema } from "./change-offer-schema";

describe("changeBusinessOfferSchema", () => {
  it("accepts the two known offer codes", () => {
    for (const offerCode of ["launch_standard", "pilot_2026"]) {
      expect(changeBusinessOfferSchema.safeParse({ businessId: "b1", offerCode }).success).toBe(true);
    }
  });

  it("rejects anything that is not a known offer code", () => {
    for (const offerCode of ["pilot", "PILOT_2026", "", "90", "launch_standard "]) {
      expect(changeBusinessOfferSchema.safeParse({ businessId: "b1", offerCode }).success).toBe(false);
    }
  });

  it("ignores spoofed pilot / trialDays fields — they never reach the parsed result", () => {
    const parsed = changeBusinessOfferSchema.safeParse({ businessId: "b1", offerCode: "launch_standard", pilot: true, trialDays: 365, priceAmountIls: 0 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(Object.keys(parsed.data).sort()).toEqual(["businessId", "offerCode"]);
  });

  it("requires a business id", () => {
    expect(changeBusinessOfferSchema.safeParse({ businessId: "", offerCode: "pilot_2026" }).success).toBe(false);
  });
});

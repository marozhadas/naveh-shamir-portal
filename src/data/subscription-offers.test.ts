import { describe, expect, it } from "vitest";
import { TRIAL_DAYS, createPriceSnapshot, type BillingInterval, type PaidPlanId } from "@/data/subscription-pricing";
import { SUBSCRIPTION_OFFERS, computeTrialWindow, getOffer, getTrialDaysForOffer, isOfferCode } from "./subscription-offers";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-08T09:00:00.000Z");

describe("subscription offers", () => {
  it("defines the standard offer as 30 trial days and the pilot as 90", () => {
    expect(SUBSCRIPTION_OFFERS.launch_standard.trialDays).toBe(30);
    expect(SUBSCRIPTION_OFFERS.pilot_2026.trialDays).toBe(90);
    expect(TRIAL_DAYS).toBe(30);
  });

  it("labels the offers for the admin and the owner", () => {
    expect(SUBSCRIPTION_OFFERS.launch_standard.trialLabel).toBe("30 ימי ניסיון");
    expect(SUBSCRIPTION_OFFERS.pilot_2026.trialLabel).toBe("90 ימי ניסיון — הטבת פיילוט");
  });

  it("never trusts an unknown offer: it falls back to the standard (shorter) one", () => {
    expect(isOfferCode("pilot_2026")).toBe(true);
    expect(isOfferCode("pilot")).toBe(false);
    expect(isOfferCode(true)).toBe(false);
    expect(getOffer("pilot=true").code).toBe("launch_standard");
    expect(getOffer(undefined).code).toBe("launch_standard");
    expect(getTrialDaysForOffer("90")).toBe(30);
  });

  it("computes the trial window from the offer only", () => {
    const standard = computeTrialWindow("launch_standard", NOW);
    expect(standard.trialDays).toBe(30);
    expect(new Date(standard.trialEndsAt).getTime() - NOW.getTime()).toBe(30 * DAY_MS);
    expect(standard.trialStartedAt).toBe(NOW.toISOString());

    const pilot = computeTrialWindow("pilot_2026", NOW);
    expect(pilot.offerCode).toBe("pilot_2026");
    expect(pilot.trialDays).toBe(90);
    expect(new Date(pilot.trialEndsAt).getTime() - NOW.getTime()).toBe(90 * DAY_MS);
  });
});

describe("offer × plan × billing interval", () => {
  const plans: PaidPlanId[] = ["plus", "premium"];
  const intervals: BillingInterval[] = ["monthly", "yearly"];
  const expectedPrice: Record<PaidPlanId, Record<BillingInterval, number>> = {
    plus: { monthly: 39, yearly: 390 },
    premium: { monthly: 49, yearly: 490 },
  };

  for (const plan of plans) {
    for (const interval of intervals) {
      it(`${plan} ${interval}: same launch price for both offers, only the trial length differs`, () => {
        const price = createPriceSnapshot(plan, interval);
        expect(price.amountIls).toBe(expectedPrice[plan][interval]);
        expect(price.isLaunchPrice).toBe(true);

        // Prices live in subscription-pricing.ts only — an offer carries no price of its own.
        expect(computeTrialWindow("launch_standard", NOW).trialDays).toBe(30);
        expect(computeTrialWindow("pilot_2026", NOW).trialDays).toBe(90);
      });
    }
  }
});

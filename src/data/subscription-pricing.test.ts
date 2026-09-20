import { describe, expect, it } from "vitest";
import { BILLING_INTERVALS, createPriceSnapshot, formatPriceWithInterval, getCurrentPrice, PRICE_VERSIONS, TRIAL_DAYS } from "./subscription-pricing";

describe("subscription pricing catalog", () => {
  it("has the agreed launch prices for both billing tracks", () => {
    expect(getCurrentPrice("plus", "monthly").amountIls).toBe(39);
    expect(getCurrentPrice("plus", "yearly").amountIls).toBe(390);
    expect(getCurrentPrice("premium", "monthly").amountIls).toBe(49);
    expect(getCurrentPrice("premium", "yearly").amountIls).toBe(490);
  });

  it("marks the current prices as launch prices", () => {
    for (const interval of BILLING_INTERVALS) {
      expect(getCurrentPrice("plus", interval).isLaunchPrice).toBe(true);
      expect(getCurrentPrice("premium", interval).isLaunchPrice).toBe(true);
    }
  });

  it("gives a 30-day trial regardless of billing track", () => {
    expect(TRIAL_DAYS).toBe(30);
  });

  it("createPriceSnapshot records the version, amount and interval it was created with", () => {
    expect(createPriceSnapshot("premium", "yearly")).toEqual({ billingInterval: "yearly", amountIls: 490, priceVersion: "launch-2026", isLaunchPrice: true });
  });

  it("a snapshot is independent from later catalog changes (value copy, not a reference)", () => {
    const snapshot = createPriceSnapshot("plus", "monthly");
    const original = PRICE_VERSIONS["launch-2026"].prices.plus.monthly;
    PRICE_VERSIONS["launch-2026"].prices.plus.monthly = 59;
    try {
      expect(snapshot.amountIls).toBe(39);
    } finally {
      PRICE_VERSIONS["launch-2026"].prices.plus.monthly = original;
    }
  });

  it("formats prices with the interval", () => {
    expect(formatPriceWithInterval(39, "monthly")).toBe("39 ₪ לחודש");
    expect(formatPriceWithInterval(390, "yearly")).toBe("390 ₪ לשנה");
  });
});

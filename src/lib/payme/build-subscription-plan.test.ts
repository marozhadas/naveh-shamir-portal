import { describe, expect, it } from "vitest";
import { buildSubscriptionPlan } from "./build-subscription-plan";

const NOW = new Date("2026-10-08T10:00:00.000Z");
const ROW = { plan_tier: "plus", selected_billing_interval: "monthly", offer_code: "launch_standard" };

function build(overrides: Partial<typeof ROW> = {}, now: Date = NOW) {
  return buildSubscriptionPlan({ ...ROW, ...overrides }, now);
}

describe("buildSubscriptionPlan - what the PayMe subscription is created from (server side only)", () => {
  it("regular offer: 30 trial days and sub_start_date 30 days ahead", () => {
    const result = build();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.offerCode).toBe("launch_standard");
    expect(result.plan.trialDays).toBe(30);
    expect(result.plan.subStartDate).toBe("07/11/2026");
    expect(result.plan.subStartDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("pilot offer: 90 trial days and sub_start_date 90 days ahead", () => {
    const result = build({ offer_code: "pilot_2026" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.offerCode).toBe("pilot_2026");
    expect(result.plan.trialDays).toBe(90);
    expect(result.plan.subStartDate).toBe("06/01/2027");
  });

  it("the trial end instant matches the trial days (the same offer snapshot)", () => {
    for (const [offer, days] of [["launch_standard", 30], ["pilot_2026", 90]] as const) {
      const result = build({ offer_code: offer });
      if (!result.ok) throw new Error("expected ok");
      expect(new Date(result.plan.trialEndsAt).getTime() - new Date(result.plan.trialStartedAt).getTime()).toBe(days * 24 * 60 * 60 * 1000);
    }
  });

  it("monthly track uses the monthly snapshot price, in agorot, with PayMe iteration type per track", () => {
    const plus = build({ plan_tier: "plus", selected_billing_interval: "monthly" });
    const premium = build({ plan_tier: "premium", selected_billing_interval: "monthly" });
    if (!plus.ok || !premium.ok) throw new Error("expected ok");
    expect(plus.plan.snapshot.amountIls).toBe(39);
    expect(plus.plan.priceAgorot).toBe(3900);
    expect(premium.plan.snapshot.amountIls).toBe(49);
    expect(premium.plan.priceAgorot).toBe(4900);
    expect(plus.plan.interval).toBe("monthly");
  });

  it("yearly track uses the yearly snapshot price", () => {
    const plus = build({ plan_tier: "plus", selected_billing_interval: "yearly" });
    const premium = build({ plan_tier: "premium", selected_billing_interval: "yearly" });
    if (!plus.ok || !premium.ok) throw new Error("expected ok");
    expect(plus.plan.snapshot.amountIls).toBe(390);
    expect(plus.plan.priceAgorot).toBe(39000);
    expect(premium.plan.snapshot.amountIls).toBe(490);
    expect(premium.plan.priceAgorot).toBe(49000);
    expect(plus.plan.interval).toBe("yearly");
  });

  it("a business with no chosen track is on the monthly one", () => {
    const result = build({ selected_billing_interval: null as never });
    if (!result.ok) throw new Error("expected ok");
    expect(result.plan.interval).toBe("monthly");
    expect(result.plan.priceAgorot).toBe(3900);
  });

  it("refuses a plan that is not a paid plan", () => {
    for (const plan_tier of ["free", "basic", "", null, undefined, "enterprise"]) {
      expect(build({ plan_tier: plan_tier as never })).toEqual({ ok: false, reason: "invalid-plan" });
    }
  });

  it("refuses an unknown billing track", () => {
    for (const interval of ["weekly", "", "YEARLY", 12]) {
      expect(build({ selected_billing_interval: interval as never })).toEqual({ ok: false, reason: "invalid-interval" });
    }
  });

  it("refuses a missing or unknown offer (no silent fallback to a different trial length)", () => {
    for (const offer of [null, undefined, "", "launch_extended", "pilot_2025"]) {
      expect(build({ offer_code: offer as never })).toEqual({ ok: false, reason: "invalid-offer" });
    }
  });

  it("takes nothing from the caller: the function has no price or trial-days input, only the stored row fields", () => {
    const result = buildSubscriptionPlan({ ...ROW, price: 1, trial_days: 3650, sub_start_date: "01/01/2020" } as never, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.plan.priceAgorot).toBe(3900);
    expect(result.plan.trialDays).toBe(30);
    expect(result.plan.subStartDate).toBe("07/11/2026");
  });
});

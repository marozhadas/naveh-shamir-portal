import { describe, expect, it } from "vitest";
import { changeBusinessPlanSchema } from "./change-plan-schema";

describe("changeBusinessPlanSchema", () => {
  it("accepts a valid basic/plus/premium newPlanId", () => {
    for (const newPlanId of ["basic", "plus", "premium"]) {
      const result = changeBusinessPlanSchema.safeParse({ businessId: "b1", newPlanId });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a newPlanId outside basic/plus/premium", () => {
    const result = changeBusinessPlanSchema.safeParse({ businessId: "b1", newPlanId: "free" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty businessId", () => {
    const result = changeBusinessPlanSchema.safeParse({ businessId: "", newPlanId: "plus" });
    expect(result.success).toBe(false);
  });

  it("accepts an optional reason", () => {
    const result = changeBusinessPlanSchema.safeParse({ businessId: "b1", newPlanId: "plus", reason: "בקשת בעל העסק" });
    expect(result.success).toBe(true);
  });

  it("rejects a reason over 500 characters", () => {
    const result = changeBusinessPlanSchema.safeParse({ businessId: "b1", newPlanId: "plus", reason: "א".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("works fine without a reason at all", () => {
    const result = changeBusinessPlanSchema.safeParse({ businessId: "b1", newPlanId: "premium" });
    expect(result.success).toBe(true);
  });
});

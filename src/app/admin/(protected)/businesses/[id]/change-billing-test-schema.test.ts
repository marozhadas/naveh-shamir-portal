import { describe, expect, it } from "vitest";
import { changeBusinessBillingTestSchema } from "./change-billing-test-schema";

describe("changeBusinessBillingTestSchema", () => {
  it("accepts a business id with a real boolean", () => {
    expect(changeBusinessBillingTestSchema.safeParse({ businessId: "b1", enabled: true }).success).toBe(true);
    expect(changeBusinessBillingTestSchema.safeParse({ businessId: "b1", enabled: false, reason: "סיום בדיקה" }).success).toBe(true);
  });

  it("rejects truthy strings and numbers — only real booleans switch the flag", () => {
    for (const enabled of ["true", "1", 1, "on", null, undefined]) {
      expect(changeBusinessBillingTestSchema.safeParse({ businessId: "b1", enabled }).success).toBe(false);
    }
  });

  it("requires a business id and bounds the note", () => {
    expect(changeBusinessBillingTestSchema.safeParse({ businessId: "", enabled: true }).success).toBe(false);
    expect(changeBusinessBillingTestSchema.safeParse({ businessId: "b1", enabled: true, reason: "x".repeat(501) }).success).toBe(false);
  });

  it("drops any extra field a crafted request adds (keys, prices, env…)", () => {
    const parsed = changeBusinessBillingTestSchema.safeParse({ businessId: "b1", enabled: true, payMeEnv: "live", sellerId: "MPL", price: 0 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(Object.keys(parsed.data).sort()).toEqual(["businessId", "enabled"]);
  });
});

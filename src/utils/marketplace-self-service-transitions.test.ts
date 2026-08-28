import { describe, expect, it } from "vitest";
import { isValidSelfServiceTransition } from "./marketplace-self-service-transitions";

describe("isValidSelfServiceTransition", () => {
  it("allows marking an active listing as sold", () => {
    expect(isValidSelfServiceTransition("active", "sold")).toBe(true);
  });

  it("allows marking an active listing as delivered (given)", () => {
    expect(isValidSelfServiceTransition("active", "delivered")).toBe(true);
  });

  it("allows restoring a sold listing back to active", () => {
    expect(isValidSelfServiceTransition("sold", "active")).toBe(true);
  });

  it("allows restoring a delivered listing back to active", () => {
    expect(isValidSelfServiceTransition("delivered", "active")).toBe(true);
  });

  it("never allows a pending listing to change at all — the poster can't skip moderation", () => {
    expect(isValidSelfServiceTransition("pending", "active")).toBe(false);
    expect(isValidSelfServiceTransition("pending", "sold")).toBe(false);
  });

  it("never allows a removed listing to be resurrected", () => {
    expect(isValidSelfServiceTransition("removed", "active")).toBe(false);
    expect(isValidSelfServiceTransition("removed", "sold")).toBe(false);
  });

  it("never allows self-service transition into pending or removed", () => {
    expect(isValidSelfServiceTransition("active", "pending")).toBe(false);
    expect(isValidSelfServiceTransition("active", "removed")).toBe(false);
    expect(isValidSelfServiceTransition("sold", "removed")).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(isValidSelfServiceTransition("active", "active")).toBe(false);
    expect(isValidSelfServiceTransition("sold", "sold")).toBe(false);
  });
});

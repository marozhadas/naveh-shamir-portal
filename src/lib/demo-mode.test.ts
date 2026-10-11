import { describe, expect, it } from "vitest";
import { isDemoModeEnabled } from "./demo-mode";

describe("isDemoModeEnabled", () => {
  it("is off in production", () => {
    expect(isDemoModeEnabled("production")).toBe(false);
  });

  it("stays on for development and test (local demo keeps working)", () => {
    expect(isDemoModeEnabled("development")).toBe(true);
    expect(isDemoModeEnabled("test")).toBe(true);
  });
});

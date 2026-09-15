import { describe, expect, it } from "vitest";
import { normalizeUsername, isValidUsername, looksLikeEmail } from "./username";

describe("normalizeUsername", () => {
  it("lowercases and trims", () => {
    expect(normalizeUsername("  Hadas-Design  ")).toBe("hadas-design");
  });
});

describe("isValidUsername", () => {
  it.each(["hadas-design", "abc", "a1b2c3", "x".repeat(30)])("accepts %s", (value) => {
    expect(isValidUsername(value)).toBe(true);
  });

  it.each([
    ["ab", "too short"],
    ["x".repeat(31), "too long"],
    ["hadas_design", "underscore not allowed"],
    ["hadas design", "space not allowed"],
    ["הדס", "Hebrew not allowed"],
    ["Hadas-Design", "must already be lowercase"],
    ["-hadas", "cannot start with a hyphen"],
    ["hadas-", "cannot end with a hyphen"],
    ["hadas--design", "no double hyphens"],
    ["hadas@design", "no special characters"],
    ["", "empty string"],
  ])("rejects %s (%s)", (value) => {
    expect(isValidUsername(value)).toBe(false);
  });
});

describe("looksLikeEmail", () => {
  it("treats any value containing @ as an email", () => {
    expect(looksLikeEmail("hadas@example.com")).toBe(true);
  });

  it("treats a value without @ as a username", () => {
    expect(looksLikeEmail("hadas-design")).toBe(false);
  });
});

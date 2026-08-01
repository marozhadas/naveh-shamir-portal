import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("keeps Hebrew letters and replaces spaces with hyphens", () => {
    expect(slugify("סטודיו נועה")).toBe("סטודיו-נועה");
  });

  it("lowercases Latin text", () => {
    expect(slugify("Studio Noa")).toBe("studio-noa");
  });

  it("strips punctuation and collapses repeated separators", () => {
    expect(slugify("מספרת קו הבית!!  (חדש)")).toBe("מספרת-קו-הבית-חדש");
  });

  it("trims leading/trailing separators", () => {
    expect(slugify("  - עסק - ")).toBe("עסק");
  });

  it("falls back to a safe default for an empty/symbols-only input", () => {
    expect(slugify("   ")).toBe("business");
    expect(slugify("!!!")).toBe("business");
  });

  it("appends a disambiguator when given one", () => {
    expect(slugify("עסק", "ab12")).toBe("עסק-ab12");
  });
});

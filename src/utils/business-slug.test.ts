import { describe, expect, it } from "vitest";
import { BUSINESS_SLUG_PATTERN, businessSlugSchema, isValidBusinessSlug, suggestSlugFromEnglishName } from "./business-slug";

describe("BUSINESS_SLUG_PATTERN / isValidBusinessSlug", () => {
  it.each(["ronis-kitchen", "mor-beauty", "pizza-24", "naama-design"])("accepts a valid slug: %s", (slug) => {
    expect(isValidBusinessSlug(slug)).toBe(true);
    expect(BUSINESS_SLUG_PATTERN.test(slug)).toBe(true);
  });

  it.each([
    "המטבח-של-רוני", // Hebrew
    "Roni-Kitchen", // uppercase
    "roni kitchen", // space
    "roni_kitchen", // underscore
    "-roni", // leading hyphen
    "roni-", // trailing hyphen
    "roni--kitchen", // double hyphen
    "", // empty
  ])("rejects an invalid slug: %s", (slug) => {
    expect(isValidBusinessSlug(slug)).toBe(false);
  });
});

describe("businessSlugSchema", () => {
  it("accepts a valid English slug", () => {
    expect(businessSlugSchema.safeParse("ronis-kitchen").success).toBe(true);
  });

  it("rejects a Hebrew slug with a specific Hebrew error message", () => {
    const result = businessSlugSchema.safeParse("המטבח-של-רוני");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("יש להזין כתובת באנגלית בלבד, באותיות קטנות ובמקפים במקום רווחים.");
    }
  });

  it("rejects an empty slug", () => {
    expect(businessSlugSchema.safeParse("").success).toBe(false);
  });

  it("rejects a slug over 120 characters", () => {
    expect(businessSlugSchema.safeParse("a".repeat(121)).success).toBe(false);
  });
});

describe("suggestSlugFromEnglishName", () => {
  it("lowercases, replaces spaces with hyphens, and strips apostrophes", () => {
    expect(suggestSlugFromEnglishName("Roni's Kitchen")).toBe("ronis-kitchen");
  });

  it("collapses multiple special characters into a single hyphen", () => {
    expect(suggestSlugFromEnglishName("Naama --- Design!!!")).toBe("naama-design");
  });

  it("trims leading/trailing hyphens produced by punctuation at the edges", () => {
    expect(suggestSlugFromEnglishName("--Pizza 24--")).toBe("pizza-24");
  });

  it("returns an empty string for a purely Hebrew name — never invents a transliteration", () => {
    expect(suggestSlugFromEnglishName("המטבח של רוני")).toBe("");
  });
});

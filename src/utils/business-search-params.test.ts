import { describe, expect, it } from "vitest";
import { parseBusinessSearchParams, serializeBusinessFilters } from "./business-search-params";

describe("parseBusinessSearchParams", () => {
  it("defaults to empty query, no categories, featured sort", () => {
    const result = parseBusinessSearchParams(new URLSearchParams(""));
    expect(result).toEqual({ query: "", categoryIds: [], sort: "featured" });
  });

  it("parses a single category", () => {
    const result = parseBusinessSearchParams(new URLSearchParams("category=beauty"));
    expect(result.categoryIds).toEqual(["beauty"]);
  });

  it("parses multiple comma-separated categories", () => {
    const result = parseBusinessSearchParams(new URLSearchParams("category=beauty,medical"));
    expect(result.categoryIds).toEqual(["beauty", "medical"]);
  });

  it("drops unknown category ids instead of crashing", () => {
    const result = parseBusinessSearchParams(new URLSearchParams("category=beauty,not-a-real-category"));
    expect(result.categoryIds).toEqual(["beauty"]);
  });

  it("de-duplicates category ids", () => {
    const result = parseBusinessSearchParams(new URLSearchParams("category=beauty,beauty"));
    expect(result.categoryIds).toEqual(["beauty"]);
  });

  it("parses the query text", () => {
    const result = parseBusinessSearchParams(new URLSearchParams("q=עוגות"));
    expect(result.query).toBe("עוגות");
  });

  it("falls back to the default sort for an unrecognized sort value", () => {
    const result = parseBusinessSearchParams(new URLSearchParams("sort=not-a-real-sort"));
    expect(result.sort).toBe("featured");
  });

  it("accepts a recognized sort value", () => {
    const result = parseBusinessSearchParams(new URLSearchParams("sort=name-asc"));
    expect(result.sort).toBe("name-asc");
  });

  it("handles a completely empty/garbage params object without throwing", () => {
    expect(() => parseBusinessSearchParams(new URLSearchParams("foo=bar&baz=qux"))).not.toThrow();
  });
});

describe("serializeBusinessFilters", () => {
  it("produces an empty string for all-default filters", () => {
    const params = serializeBusinessFilters({ query: "", categoryIds: [], sort: "featured" });
    expect(params.toString()).toBe("");
  });

  it("trims the query before serializing", () => {
    const params = serializeBusinessFilters({ query: "  עוגות  ", categoryIds: [], sort: "featured" });
    expect(params.get("q")).toBe("עוגות");
  });

  it("joins multiple categories with a comma", () => {
    const params = serializeBusinessFilters({ query: "", categoryIds: ["beauty", "medical"], sort: "featured" });
    expect(params.get("category")).toBe("beauty,medical");
  });

  it("omits sort when it's the default", () => {
    const params = serializeBusinessFilters({ query: "", categoryIds: [], sort: "featured" });
    expect(params.has("sort")).toBe(false);
  });

  it("includes sort when it's non-default", () => {
    const params = serializeBusinessFilters({ query: "", categoryIds: [], sort: "newest" });
    expect(params.get("sort")).toBe("newest");
  });

  it("round-trips through parse", () => {
    const original = { query: "פילאטיס", categoryIds: ["fitness", "beauty"], sort: "name-desc" as const };
    const roundTripped = parseBusinessSearchParams(serializeBusinessFilters(original));
    expect(roundTripped).toEqual(original);
  });
});

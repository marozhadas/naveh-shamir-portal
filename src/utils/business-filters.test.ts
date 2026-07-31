import { describe, expect, it } from "vitest";
import { filterBusinesses, getCategoryCounts, normalizeSearchTerm, sortBusinesses } from "./business-filters";
import type { Business } from "@/types/business";
import type { BusinessFilters } from "@/types/business-filters";

function makeBusiness(overrides: Partial<Business>): Business {
  return {
    id: "id",
    slug: "slug",
    name: "עסק",
    category: "שירותים",
    description: "תיאור",
    imageUrl: "",
    imageAlt: "",
    categoryIds: [],
    visible: true,
    ...overrides,
  };
}

const BASE_FILTERS: BusinessFilters = { query: "", categoryIds: [], sort: "featured" };

describe("normalizeSearchTerm", () => {
  it("trims and lowercases", () => {
    expect(normalizeSearchTerm("  Café  ")).toBe("café");
  });
});

describe("filterBusinesses", () => {
  const businesses = [
    makeBusiness({ id: "1", name: "מאפיית הפינה", description: "לחם ומאפים", categoryIds: ["food"] }),
    makeBusiness({ id: "2", name: "סטודיו תנועה", description: "יוגה ופילאטיס", categoryIds: ["fitness"] }),
    makeBusiness({ id: "3", name: "עסק מוסתר", description: "לא אמור להופיע", categoryIds: ["food"], visible: false }),
    makeBusiness({ id: "4", name: "משרד עורכי דין", description: "ליווי משפטי", categoryIds: ["legal"], address: "רחוב האלון 1" }),
  ];

  it("excludes non-visible businesses", () => {
    const result = filterBusinesses(businesses, BASE_FILTERS);
    expect(result.some((b) => b.id === "3")).toBe(false);
  });

  it("excludes businesses whose status isn't published (draft/suspended/etc.), even if visible: true", () => {
    const draft = makeBusiness({ id: "draft", visible: true, status: "draft" });
    const suspended = makeBusiness({ id: "suspended", visible: true, status: "suspended" });
    const published = makeBusiness({ id: "published", visible: true, status: "published" });
    const result = filterBusinesses([draft, suspended, published], BASE_FILTERS);
    expect(result.map((b) => b.id)).toEqual(["published"]);
  });

  it("treats a business with no status field at all as visible (legacy/homepage records predate status)", () => {
    const legacy = makeBusiness({ id: "legacy", visible: true, status: undefined });
    const result = filterBusinesses([legacy], BASE_FILTERS);
    expect(result.map((b) => b.id)).toEqual(["legacy"]);
  });

  it("matches by name", () => {
    const result = filterBusinesses(businesses, { ...BASE_FILTERS, query: "תנועה" });
    expect(result.map((b) => b.id)).toEqual(["2"]);
  });

  it("matches by description", () => {
    const result = filterBusinesses(businesses, { ...BASE_FILTERS, query: "יוגה" });
    expect(result.map((b) => b.id)).toEqual(["2"]);
  });

  it("matches by address", () => {
    const result = filterBusinesses(businesses, { ...BASE_FILTERS, query: "האלון" });
    expect(result.map((b) => b.id)).toEqual(["4"]);
  });

  it("trims the query and ignores case", () => {
    const result = filterBusinesses(businesses, { ...BASE_FILTERS, query: "  תנועה  " });
    expect(result.map((b) => b.id)).toEqual(["2"]);
  });

  it("an empty query returns everything visible", () => {
    const result = filterBusinesses(businesses, BASE_FILTERS);
    expect(result).toHaveLength(3);
  });

  it("filters by a single category", () => {
    const result = filterBusinesses(businesses, { ...BASE_FILTERS, categoryIds: ["fitness"] });
    expect(result.map((b) => b.id)).toEqual(["2"]);
  });

  it("filters by multiple categories using OR semantics", () => {
    const result = filterBusinesses(businesses, { ...BASE_FILTERS, categoryIds: ["fitness", "legal"] });
    expect(result.map((b) => b.id).sort()).toEqual(["2", "4"]);
  });

  it("an unrecognized category simply matches nothing, without throwing", () => {
    const result = filterBusinesses(businesses, { ...BASE_FILTERS, categoryIds: ["does-not-exist"] });
    expect(result).toHaveLength(0);
  });

  it("combines query and category filters", () => {
    const result = filterBusinesses(businesses, { ...BASE_FILTERS, query: "מאפים", categoryIds: ["food"] });
    expect(result.map((b) => b.id)).toEqual(["1"]);
  });

  it("does not mutate the input array", () => {
    const before = [...businesses];
    filterBusinesses(businesses, { ...BASE_FILTERS, query: "תנועה" });
    expect(businesses).toEqual(before);
  });
});

describe("sortBusinesses", () => {
  const businesses = [
    makeBusiness({ id: "1", name: "ת עסק", featured: false, createdAt: "2026-01-01T00:00:00+03:00" }),
    makeBusiness({ id: "2", name: "א עסק", featured: true, createdAt: "2026-03-01T00:00:00+03:00" }),
    makeBusiness({ id: "3", name: "ב עסק", featured: false, createdAt: "2026-06-01T00:00:00+03:00" }),
  ];

  it("featured: featured businesses first, then alphabetically", () => {
    const result = sortBusinesses(businesses, "featured");
    expect(result.map((b) => b.id)).toEqual(["2", "3", "1"]);
  });

  it("name-asc: alphabetical", () => {
    const result = sortBusinesses(businesses, "name-asc");
    expect(result.map((b) => b.id)).toEqual(["2", "3", "1"]);
  });

  it("name-desc: reverse alphabetical", () => {
    const result = sortBusinesses(businesses, "name-desc");
    expect(result.map((b) => b.id)).toEqual(["1", "3", "2"]);
  });

  it("newest: most recent createdAt first", () => {
    const result = sortBusinesses(businesses, "newest");
    expect(result.map((b) => b.id)).toEqual(["3", "2", "1"]);
  });

  it("does not mutate the input array", () => {
    const before = [...businesses];
    sortBusinesses(businesses, "name-asc");
    expect(businesses).toEqual(before);
  });
});

describe("getCategoryCounts", () => {
  const businesses = [
    makeBusiness({ id: "1", categoryIds: ["food"] }),
    makeBusiness({ id: "2", categoryIds: ["food", "events"] }),
    makeBusiness({ id: "3", categoryIds: ["legal"], visible: false }),
  ];

  it("counts occurrences per category, ignoring non-visible businesses", () => {
    expect(getCategoryCounts(businesses, "")).toEqual({ food: 2, events: 1 });
  });

  it("is scoped to the search query but not to any category selection", () => {
    const withNames = [
      makeBusiness({ id: "1", name: "מאפייה", categoryIds: ["food"] }),
      makeBusiness({ id: "2", name: "מספרה", categoryIds: ["beauty"] }),
    ];
    expect(getCategoryCounts(withNames, "מאפייה")).toEqual({ food: 1 });
  });
});

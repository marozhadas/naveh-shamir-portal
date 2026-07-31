import { describe, expect, it } from "vitest";
import { getRelatedBusinesses } from "./get-related-businesses";
import type { Business } from "@/types/business";

function makeBusiness(overrides: Partial<Business>): Business {
  return {
    id: "id",
    slug: "slug",
    name: "עסק",
    category: "שירותים",
    description: "",
    imageUrl: "",
    imageAlt: "",
    categoryIds: [],
    status: "published",
    ...overrides,
  };
}

describe("getRelatedBusinesses", () => {
  const current = makeBusiness({ id: "current", categoryIds: ["food"] });

  it("excludes the current business itself", () => {
    const result = getRelatedBusinesses(current, [current], 4);
    expect(result).toHaveLength(0);
  });

  it("excludes businesses that aren't published", () => {
    const draft = makeBusiness({ id: "draft", categoryIds: ["food"], status: "draft" });
    const result = getRelatedBusinesses(current, [current, draft], 4);
    expect(result).toHaveLength(0);
  });

  it("requires at least one shared category", () => {
    const unrelated = makeBusiness({ id: "unrelated", categoryIds: ["legal"] });
    const related = makeBusiness({ id: "related", categoryIds: ["food"] });
    const result = getRelatedBusinesses(current, [current, unrelated, related], 4);
    expect(result.map((b) => b.id)).toEqual(["related"]);
  });

  it("sorts featured businesses first, then alphabetically", () => {
    const b1 = makeBusiness({ id: "b1", name: "ת עסק", categoryIds: ["food"], featured: false });
    const b2 = makeBusiness({ id: "b2", name: "א עסק", categoryIds: ["food"], featured: true });
    const b3 = makeBusiness({ id: "b3", name: "ב עסק", categoryIds: ["food"], featured: false });
    const result = getRelatedBusinesses(current, [current, b1, b2, b3], 4);
    expect(result.map((b) => b.id)).toEqual(["b2", "b3", "b1"]);
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 6 }, (_, i) => makeBusiness({ id: `b${i}`, categoryIds: ["food"] }));
    const result = getRelatedBusinesses(current, [current, ...many], 4);
    expect(result).toHaveLength(4);
  });

  it("does not mutate the input array", () => {
    const list = [current, makeBusiness({ id: "related", categoryIds: ["food"] })];
    const before = [...list];
    getRelatedBusinesses(current, list, 4);
    expect(list).toEqual(before);
  });
});

import { describe, expect, it } from "vitest";
import { EMPTY_COMMUNITY_NEWS_FORM_VALUES, communityNewsFormSchema } from "./schema";
import type { CommunityNewsFormValues } from "./schema";

function makeValues(overrides: Partial<CommunityNewsFormValues> = {}): CommunityNewsFormValues {
  return {
    ...EMPTY_COMMUNITY_NEWS_FORM_VALUES,
    title: "עדכון מהשכונה",
    slug: "neighborhood-update",
    excerpt: "תקציר קצר",
    body: "גוף הכתבה המלא",
    ...overrides,
  };
}

function issuesFor(values: CommunityNewsFormValues, path: string): string[] {
  const result = communityNewsFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path.join(".") === path).map((i) => i.message);
}

describe("communityNewsFormSchema", () => {
  it("accepts a fully valid article", () => {
    expect(communityNewsFormSchema.safeParse(makeValues()).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(issuesFor(makeValues({ title: "" }), "title").length).toBeGreaterThan(0);
  });

  it("rejects a title over 140 characters", () => {
    expect(issuesFor(makeValues({ title: "א".repeat(141) }), "title").length).toBeGreaterThan(0);
  });

  it("accepts a Hebrew slug (letters, numbers, hyphens)", () => {
    expect(communityNewsFormSchema.safeParse(makeValues({ slug: "עדכון-מהשכונה-2026" })).success).toBe(true);
  });

  it("rejects a slug with spaces or symbols", () => {
    expect(issuesFor(makeValues({ slug: "לא תקין!" }), "slug").length).toBeGreaterThan(0);
  });

  it("rejects an empty excerpt", () => {
    expect(issuesFor(makeValues({ excerpt: "" }), "excerpt").length).toBeGreaterThan(0);
  });

  it("rejects an excerpt over 220 characters", () => {
    expect(issuesFor(makeValues({ excerpt: "א".repeat(221) }), "excerpt").length).toBeGreaterThan(0);
  });

  it("rejects an empty body", () => {
    expect(issuesFor(makeValues({ body: "" }), "body").length).toBeGreaterThan(0);
  });

  it("accepts a long body up to the 5000 character limit", () => {
    expect(communityNewsFormSchema.safeParse(makeValues({ body: "א".repeat(5000) })).success).toBe(true);
  });

  it("rejects a body over 5000 characters", () => {
    expect(issuesFor(makeValues({ body: "א".repeat(5001) }), "body").length).toBeGreaterThan(0);
  });
});

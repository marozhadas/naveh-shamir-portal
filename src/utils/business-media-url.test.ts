import { describe, expect, it } from "vitest";
import { collectBusinessImageUrls, isOwnedBusinessMediaUrl } from "./business-media-url";

const SUPABASE = "https://abc.supabase.co";
const REG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const base = `${SUPABASE}/storage/v1/object/public/business-media/registrations`;

describe("isOwnedBusinessMediaUrl", () => {
  it("accepts an image in the business's own folder", () => {
    expect(isOwnedBusinessMediaUrl(`${base}/${REG}/gallery/a.jpg`, SUPABASE, REG)).toBe(true);
  });

  it("rejects another business's folder", () => {
    expect(isOwnedBusinessMediaUrl(`${base}/${OTHER}/gallery/a.jpg`, SUPABASE, REG)).toBe(false);
  });

  it("rejects external hosts and other buckets", () => {
    expect(isOwnedBusinessMediaUrl("https://evil.example/x.jpg", SUPABASE, REG)).toBe(false);
    expect(isOwnedBusinessMediaUrl(`${SUPABASE}/storage/v1/object/public/hero-gallery/registrations/${REG}/a.jpg`, SUPABASE, REG)).toBe(false);
  });

  it("rejects path traversal and missing config", () => {
    expect(isOwnedBusinessMediaUrl(`${base}/${REG}/../${OTHER}/a.jpg`, SUPABASE, REG)).toBe(false);
    expect(isOwnedBusinessMediaUrl(`${base}/${REG}/a.jpg`, "", REG)).toBe(false);
  });
});

describe("collectBusinessImageUrls", () => {
  it("gathers cover, gallery and testimonial photos, skipping empties", () => {
    expect(
      collectBusinessImageUrls({
        coverImage: { url: "c" },
        gallery: [{ url: "g1" }, { url: "g2" }],
        testimonials: [{ imageUrl: "t1" }, {}],
      }),
    ).toEqual(["c", "g1", "g2", "t1"]);
  });
});

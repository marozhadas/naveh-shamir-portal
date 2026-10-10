import { describe, expect, it } from "vitest";
import { STATIC_SITEMAP_PATHS, buildSitemapEntries } from "./sitemap-entries";
import { absoluteUrl } from "./site-metadata";

const ORIGIN = "https://neveshamir.co.il";

describe("buildSitemapEntries", () => {
  it("with no dynamic content it still returns the static public pages (a failed data source never empties the sitemap)", () => {
    const entries = buildSitemapEntries();
    expect(entries.map((e) => e.url)).toEqual(STATIC_SITEMAP_PATHS.map((path) => `${ORIGIN}${path}`));
    expect(entries[0].url).toBe(`${ORIGIN}/`);
  });

  it("every URL is absolute on the official domain and unique", () => {
    const entries = buildSitemapEntries({ businesses: [{ slug: "a" }, { slug: "a" }], news: [{ slug: "n" }], events: [{ slug: "e" }] });
    const urls = entries.map((e) => e.url);
    for (const url of urls) expect(url.startsWith(`${ORIGIN}/`)).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain(`${ORIGIN}/businesses/a`);
    expect(urls).toContain(`${ORIGIN}/news/n`);
    expect(urls).toContain(`${ORIGIN}/events/e`);
  });

  it("never contains private, flow, noindex or placeholder routes", () => {
    const urls = buildSitemapEntries({ businesses: [{ slug: "x" }], news: [{ slug: "y" }], events: [{ slug: "z" }] }).map((e) => new URL(e.url).pathname);
    for (const path of urls) {
      expect(path).not.toMatch(/^\/(admin|api|auth)(\/|$)/);
      expect(path).not.toMatch(/^\/business\/(register|owner|dashboard|trial|plans)/);
      expect(path).not.toMatch(/^\/marketplace\/.+/); // listing detail pages are noindex
      expect(path).not.toMatch(/manage|preview|login|reset|forgot/);
    }
    expect(urls).not.toContain("/community-board");
    expect(urls).not.toContain("/business/plans");
  });

  it("lastModified only when the data has a real date; no priority / changeFrequency", () => {
    const entries = buildSitemapEntries({
      businesses: [{ slug: "no-date" }],
      news: [{ slug: "dated", lastModified: "2026-09-30T10:00:00.000Z" }, { slug: "bad", lastModified: "not-a-date" }],
    });
    const byUrl = new Map(entries.map((e) => [e.url, e]));
    expect(byUrl.get(`${ORIGIN}/businesses/no-date`)?.lastModified).toBeUndefined();
    expect(byUrl.get(`${ORIGIN}/news/dated`)?.lastModified).toEqual(new Date("2026-09-30T10:00:00.000Z"));
    expect(byUrl.get(`${ORIGIN}/news/bad`)?.lastModified).toBeUndefined();
    for (const e of entries) {
      expect(e).not.toHaveProperty("priority");
      expect(e).not.toHaveProperty("changeFrequency");
    }
    expect(byUrl.get(`${ORIGIN}/`)?.lastModified).toBeUndefined();
  });

  it("Hebrew slugs are encoded exactly like the canonical URL (same helper, one form per page)", () => {
    const slug = "פתיחת-שנה";
    const [, , , entry] = [null, null, null, buildSitemapEntries({ news: [{ slug }] }).find((e) => e.url.includes("/news/"))];
    expect(entry?.url).toBe(absoluteUrl(`/news/${slug}`));
    expect(entry?.url).toContain("%D7%A4");
  });

  it("skips entities without a slug", () => {
    const urls = buildSitemapEntries({ businesses: [{ slug: "" }], news: [{ slug: "" }], events: [{ slug: "" }] }).map((e) => e.url);
    expect(urls).toHaveLength(STATIC_SITEMAP_PATHS.length);
  });
});

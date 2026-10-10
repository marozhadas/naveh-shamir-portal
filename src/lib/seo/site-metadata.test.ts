import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { BASE_OPEN_GRAPH, SITE_METADATA_BASE, absoluteUrl, staticPageMetadata } from "./site-metadata";
import { SITE_CONFIG } from "@/data/config";

const OFFICIAL = "https://neveshamir.co.il";
const appDir = path.resolve(__dirname, "../../app");
const read = (rel: string) => fs.readFileSync(path.join(appDir, rel), "utf8");

describe("site metadata uses the official domain, never the request host", () => {
  it("metadataBase and absoluteUrl come from SITE_CONFIG.siteUrl", () => {
    expect(SITE_CONFIG.siteUrl).toBe(OFFICIAL);
    expect(SITE_METADATA_BASE.origin).toBe(OFFICIAL);
    expect(absoluteUrl("/")).toBe(`${OFFICIAL}/`);
    expect(absoluteUrl("/businesses/foo")).toBe(`${OFFICIAL}/businesses/foo`);
  });

  it("a relative canonical resolves to the official domain, whatever host the request came from", () => {
    // Next resolves relative metadata URLs against metadataBase only — there is no request-host input anywhere.
    for (const canonical of ["/", "/privacy", "/terms", "/accessibility", "/businesses/foo"]) {
      expect(new URL(canonical, SITE_METADATA_BASE).href).toBe(`${OFFICIAL}${canonical}`);
    }
  });

  it("the root layout sets metadataBase and the site name; no host/headers input is read for metadata", () => {
    const layout = read("layout.tsx");
    expect(layout).toMatch(/metadataBase:\s*SITE_METADATA_BASE/);
    expect(layout).toContain("BASE_OPEN_GRAPH");
    expect(BASE_OPEN_GRAPH.siteName).toBe("פורטל נווה שמיר");
    const metadataBlock = layout.slice(layout.indexOf("export const metadata"), layout.indexOf("export default"));
    expect(metadataBlock).not.toMatch(/headers\(|process\.env|VERCEL|x-forwarded/i);
  });

  it("home and the legal pages declare a self-canonical", () => {
    expect(read("page.tsx")).toMatch(/alternates:\s*\{\s*canonical:\s*"\/"\s*\}/);
    for (const name of ["privacy", "terms", "accessibility"]) {
      expect(read(`${name}/page.tsx`)).toMatch(new RegExp(`path:\\s*"/${name}"`));
    }
  });

  it("staticPageMetadata: unique title/description, canonical and og:url are the same path, og repeats the title", () => {
    const meta = staticPageMetadata({ title: "תנאי שימוש | נווה שמיר - הפורטל של השכונה", description: "תיאור הדף", path: "/terms" });
    expect(meta.alternates?.canonical).toBe("/terms");
    expect(meta.openGraph).toMatchObject({ url: "/terms", title: meta.title, description: "תיאור הדף", siteName: "פורטל נווה שמיר", locale: "he_IL" });
  });

  it("the three legal pages get distinct titles and descriptions, with no long dash", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const name of ["privacy", "terms", "accessibility"]) {
      const source = read(`${name}/page.tsx`);
      const title = source.match(/title:\s*"([^"]+)"/)?.[1] ?? "";
      const description = source.match(/description:\s*"([^"]+)"/)?.[1] ?? "";
      expect(title.endsWith("| נווה שמיר - הפורטל של השכונה")).toBe(true);
      expect(description.length).toBeGreaterThan(40);
      expect(`${title}${description}`).not.toMatch(/[—–]/);
      titles.add(title);
      descriptions.add(description);
    }
    expect(titles.size).toBe(3);
    expect(descriptions.size).toBe(3);
  });
});

describe("robots", () => {
  it("allows crawling, announces the absolute sitemap, and blocks nothing (noindex must stay readable, /_next/ must stay crawlable)", async () => {
    vi.resetModules();
    const { default: robots } = await import("../../app/robots");
    const result = robots();
    expect(result.sitemap).toBe(`${OFFICIAL}/sitemap.xml`);
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules).toEqual([{ userAgent: "*", allow: "/" }]);
    for (const rule of rules) expect(JSON.stringify(rule)).not.toMatch(/disallow|_next/i);
  });
});

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site-metadata";

/**
 * Crawling is open for the whole public site and the sitemap is announced. Nothing is disallowed on purpose:
 * private areas (admin, login, dashboard, registration, marketplace listing pages) are kept out of the index with
 * `noindex` — which a crawler can only read if it is allowed to fetch the page — and /_next/ (CSS, JS, images) must
 * stay crawlable so pages can be rendered. Bot-specific access (e.g. ClaudeBot) is a Cloudflare setting, not handled here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

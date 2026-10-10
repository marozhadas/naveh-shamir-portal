import type { MetadataRoute } from "next";
import { absoluteUrl } from "./site-metadata";

/**
 * Pure builder of the sitemap: given the already-filtered public content, returns the entries. Everything is an
 * absolute URL on the official domain, built the same way as the canonical URLs (same URL encoding for Hebrew slugs).
 * `lastModified` is set only when the data has a real date. No priority / changeFrequency (Google ignores them).
 *
 * What is NOT here, on purpose: admin, login/reset, dashboards, registration, management-token routes, previews, API
 * routes, marketplace listing detail pages (they are noindex), /business/plans (noindex), /community-board (placeholder).
 */

/** Public, indexable pages that need no data. Every one of them sets its own self-canonical. */
export const STATIC_SITEMAP_PATHS = ["/", "/businesses", "/news", "/events", "/marketplace", "/essential-numbers", "/contact", "/privacy", "/terms", "/accessibility"] as const;

type Dated = { slug: string; lastModified?: string | null };

export type SitemapContent = {
  /** Only businesses whose public profile page is actually open (published AND with profile access). */
  businesses: Dated[];
  /** Published articles only. */
  news: Dated[];
  /** Published events only. */
  events: Dated[];
};

function validDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function entry(path: string, lastModified?: string | null): MetadataRoute.Sitemap[number] {
  const date = validDate(lastModified);
  return date ? { url: absoluteUrl(path), lastModified: date } : { url: absoluteUrl(path) };
}

export function buildSitemapEntries(content: Partial<SitemapContent> = {}): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  const push = (path: string, lastModified?: string | null) => {
    const built = entry(path, lastModified);
    if (seen.has(built.url)) return;
    seen.add(built.url);
    out.push(built);
  };

  for (const path of STATIC_SITEMAP_PATHS) push(path);
  for (const business of content.businesses ?? []) if (business.slug) push(`/businesses/${business.slug}`, business.lastModified);
  for (const article of content.news ?? []) if (article.slug) push(`/news/${article.slug}`, article.lastModified);
  for (const event of content.events ?? []) if (event.slug) push(`/events/${event.slug}`, event.lastModified);
  return out;
}

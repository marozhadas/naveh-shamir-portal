import type { Metadata } from "next";
import { SITE_CONFIG } from "@/data/config";

/**
 * Single source of truth for the site-wide metadata. The official origin comes ONLY from SITE_CONFIG.siteUrl
 * (never from the request host), so every canonical / og:url / sitemap entry points at the official domain no matter
 * which host served the page.
 */

export const SITE_TITLE = "נווה שמיר — הפורטל של השכונה";
export const SITE_DESCRIPTION = "כל המידע המקומי של נווה שמיר במקום אחד: עסקים, אירועים, לוחות קהילה, גמ״חים ומידע שימושי לתושבי השכונה.";

/** Next.js resolves every relative canonical / Open Graph URL against this. */
export const SITE_METADATA_BASE = new URL(SITE_CONFIG.siteUrl);

/** og:site_name — a name of the site, not a page title. */
export const OG_SITE_NAME = "פורטל נווה שמיר";

/** Open Graph fields shared by every page that defines its own openGraph object (Next replaces the parent's object). */
export const BASE_OPEN_GRAPH = { siteName: OG_SITE_NAME, locale: "he_IL", type: "website" } as const;

/** Absolute URL of a path on the official domain (path must start with "/"). */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_METADATA_BASE).toString();
}

/**
 * An absolute URL for a stored image/link value: http(s) stays exactly as it is (it is already absolute — gluing the
 * site origin in front of it produces a broken URL), a root-relative path joins the official origin, anything empty
 * or unrecognisable yields undefined so no wrong value is emitted.
 */
export function resolveAbsoluteUrl(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return absoluteUrl(trimmed);
  return undefined;
}

/** Metadata for a simple static page: unique title + description, self-canonical, and matching Open Graph. */
export function staticPageMetadata(input: { title: string; description: string; path: string }): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: { ...BASE_OPEN_GRAPH, title: input.title, description: input.description, url: input.path },
  };
}

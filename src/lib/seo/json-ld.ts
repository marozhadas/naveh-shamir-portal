import type { CommunityNewsRow } from "@/types/community-news";
import { OG_SITE_NAME, absoluteUrl, resolveAbsoluteUrl } from "./site-metadata";

/** Escapes `<` so a value containing "</script>" can never break out of the JSON-LD script tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The portal's own public logo (a file that exists in /public and is served as a PNG). */
const LOGO_PATH = "/images/logo-color.png";

const ORGANIZATION_ID = () => `${absoluteUrl("/")}#organization`;
const WEBSITE_ID = () => `${absoluteUrl("/")}#website`;

/**
 * Home-page entity graph: the portal as an Organization and as a WebSite, linked by @id. Only facts that are already
 * public on the site: name, URL, logo. Deliberately no legal name, tax id, address, phone or sameAs — none of that is
 * verified data in the system. The neighbourhood's businesses are NOT modelled as branches of this organization.
 */
export function createSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID(),
        name: OG_SITE_NAME,
        url: absoluteUrl("/"),
        logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PATH) },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID(),
        name: OG_SITE_NAME,
        url: absoluteUrl("/"),
        inLanguage: "he",
        publisher: { "@id": ORGANIZATION_ID() },
      },
    ],
  };
}

type ArticleInput = Pick<CommunityNewsRow, "title" | "slug" | "excerpt" | "image_url" | "status" | "published_at" | "updated_at">;

/**
 * Article structured data for a REAL, published article only (null otherwise). Uses only fields that exist: the dates are
 * the stored ISO timestamps exactly as they are (no offset pasted on, the instant is never changed), the image is the
 * article's own image, and there is deliberately no `author` — the data has none, and a made-up Person would be worse than
 * none.
 */
export function createArticleJsonLd(article: ArticleInput): Record<string, unknown> | null {
  if (article.status !== "published") return null;

  const url = absoluteUrl(`/news/${article.slug}`);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    publisher: { "@type": "Organization", "@id": ORGANIZATION_ID(), name: OG_SITE_NAME, logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PATH) } },
  };
  if (article.excerpt) data.description = article.excerpt;
  if (article.published_at) data.datePublished = article.published_at;
  if (article.updated_at) data.dateModified = article.updated_at;
  const image = resolveAbsoluteUrl(article.image_url);
  if (image) data.image = [image];
  return data;
}

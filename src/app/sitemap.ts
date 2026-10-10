import type { MetadataRoute } from "next";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { FALLBACK_BASIC_ACCESS, getListingAccessByBusinessId } from "@/domain/get-business-listing-access";
import { getPublishedNews } from "@/repositories/community-news-service";
import { getPublishedEvents } from "@/repositories/community-events-service";
import { buildSitemapEntries, type SitemapContent } from "@/lib/seo/sitemap-entries";

// Reads live published content, like the pages themselves — a new business / article / event appears without a redeploy.
export const dynamic = "force-dynamic";

/** Each source is read through the same public data access the pages use; a source that fails simply contributes nothing. */
async function safely<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`[sitemap] ${label} failed:`, error instanceof Error ? error.message : "unknown");
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content: SitemapContent = {
    businesses: await safely("businesses", async () => {
      const businesses = await businessRepository.getAllPublished();
      const access = await getListingAccessByBusinessId(businesses, subscriptionRepository, new Date());
      // Only businesses whose profile page is really open to the public (the same rule the page itself applies).
      return businesses.filter((business) => (access[business.id] ?? FALLBACK_BASIC_ACCESS).canOpenProfile).map((business) => ({ slug: business.slug, lastModified: business.updatedAt ?? null }));
    }),
    news: await safely("news", async () => (await getPublishedNews()).map((article) => ({ slug: article.slug, lastModified: article.updated_at }))),
    events: await safely("events", async () => (await getPublishedEvents()).map((event) => ({ slug: event.slug, lastModified: event.updated_at }))),
  };
  return buildSitemapEntries(content);
}

export type CommunityNewsStatus = "draft" | "published" | "archived";

/**
 * How many of the newest published articles the homepage teaser shows (CommunityPulseSection) —
 * the /news archive skips exactly this many from the front so the same article never appears on
 * both pages. Lives here (not in the server-only community-news-service.ts) because
 * ConnectedUpcomingEvents.tsx, a client component, needs it too.
 */
export const HOMEPAGE_NEWS_COUNT = 2;

export const COMMUNITY_NEWS_STATUS_LABEL: Record<CommunityNewsStatus, string> = {
  draft: "טיוטה",
  published: "מפורסם",
  archived: "בארכיון",
};

/** Mirrors the public.community_news table (see the create_community_news_table migration). */
export type CommunityNewsRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  image_alt: string | null;
  status: CommunityNewsStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

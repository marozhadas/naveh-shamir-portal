import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { CommunityNewsRow } from "@/types/community-news";

/** Every published article, newest first — RLS already restricts anon to status="published" (see the create_community_news_table migration), so the .eq() here is belt-and-suspenders. */
export async function getPublishedNews(): Promise<CommunityNewsRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("community_news")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) {
    console.error("[getPublishedNews] failed:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Returns null both when the article doesn't exist and when it's still a draft (RLS hides draft
 * rows from anon entirely) — the caller can't tell those apart, which is intentional, matching
 * the same pattern already used for events/marketplace listings.
 */
export async function getNewsBySlug(slug: string): Promise<CommunityNewsRow | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("community_news").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    console.error("[getNewsBySlug] failed:", error.message);
    return null;
  }
  return data;
}

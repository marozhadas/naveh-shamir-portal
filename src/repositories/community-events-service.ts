import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { CommunityEventRow } from "@/types/community-event";

/** Every published event, any date — the public /events page does its own date/audience filtering client-side over this full set. RLS itself would also allow canceled/archived through, but the list intentionally only ever asks for "published". */
export async function getPublishedEvents(): Promise<CommunityEventRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").eq("status", "published").order("event_date", { ascending: true });
  if (error) {
    console.error("[getPublishedEvents] failed:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Returns null both when the event doesn't exist and when it's still a draft (RLS hides draft
 * rows from anon entirely) — the caller can't tell those apart, which is intentional. Published/
 * canceled/archived events ARE returned, so a shared link to a canceled event still resolves with
 * a "בוטל" indicator instead of a 404, matching the same pattern as marketplace listings.
 */
export async function getEventBySlug(slug: string): Promise<CommunityEventRow | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    console.error("[getEventBySlug] failed:", error.message);
    return null;
  }
  return data;
}

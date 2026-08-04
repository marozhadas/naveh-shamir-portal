import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { MarketplaceListingRow } from "@/types/marketplace";

/**
 * The browse grid only ever shows status="active" listings — reserved/delivered/sold/removed
 * ones would just be clutter here, even though RLS itself allows anon to read any non-pending
 * status (see getActiveListingBySlug: a direct link to a listing that's since sold must still
 * resolve, with a "no longer active" indicator, not a 404).
 */
export async function getActiveListings(): Promise<MarketplaceListingRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("marketplace_listings").select("*").eq("status", "active").order("created_at", { ascending: false });
  if (error) {
    console.error("[getActiveListings] failed:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Returns null both when the listing doesn't exist and when it's still pending (RLS hides
 * pending rows from anon entirely) — the caller can't tell those apart, which is intentional
 * (never leak "it exists but isn't approved yet"). Any other status (active/reserved/delivered/
 * sold/removed) IS returned, so a shared link to a listing that's since sold still resolves —
 * the page itself shows a "no longer active" indicator instead of contact buttons.
 */
export async function getActiveListingBySlug(slug: string): Promise<MarketplaceListingRow | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("marketplace_listings").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    console.error("[getActiveListingBySlug] failed:", error.message);
    return null;
  }
  return data;
}

/**
 * Calls a SECURITY DEFINER RPC (report_marketplace_listing) rather than exposing a broad anon
 * UPDATE policy — the function itself only ever touches report_count on an active listing, so
 * there's no way for a visitor to modify price/status/contact details through this path.
 */
export async function reportListing(listingId: string): Promise<boolean> {
  const supabase = createPublicSupabaseClient();
  const { error } = await supabase.rpc("report_marketplace_listing", { listing_id: listingId });
  if (error) {
    console.error("[reportListing] failed:", error.message);
    return false;
  }
  return true;
}

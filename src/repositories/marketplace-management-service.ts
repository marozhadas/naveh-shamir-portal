import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { hashManagementToken } from "@/utils/marketplace-management-token";
import { isValidSelfServiceTransition } from "@/utils/marketplace-self-service-transitions";
import type { MarketplaceListingRow, MarketplaceListingStatus } from "@/types/marketplace";

/**
 * Looks up a listing by its management token — the ONLY lookup path for this flow, deliberately
 * raw-token -> hash -> DB equality, never a query against a raw token column (there isn't one).
 * Uses the service-role admin client, not the public/anon client: possession of the token IS the
 * authorization here, so this must be able to find a listing regardless of its moderation status
 * (including still-pending), which the anon client's RLS policy would otherwise hide.
 */
export async function getManagedListingByToken(rawToken: string): Promise<MarketplaceListingRow | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminSupabaseClient();
  const tokenHash = hashManagementToken(rawToken);
  const { data, error } = await admin.from("marketplace_listings").select("*").eq("management_token_hash", tokenHash).maybeSingle();
  if (error) {
    console.error("[getManagedListingByToken] failed:", error.message);
    return null;
  }
  return data;
}

/** Touches management_token_last_used_at without changing anything else — called whenever a valid token is used, whether just viewing the manage page or changing status. */
export async function touchManagementTokenLastUsed(listingId: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("marketplace_listings").update({ management_token_last_used_at: new Date().toISOString() }).eq("id", listingId);
  if (error) console.error("[touchManagementTokenLastUsed] failed:", error.message);
}

export type UpdateManagedListingStatusResult =
  | { success: true; listing: MarketplaceListingRow; previousStatus: MarketplaceListingStatus }
  | { success: false; reason: "not-found" | "invalid-transition" };

/**
 * Deliberately separate from the admin's updateMarketplaceListingStatus (src/lib/admin/marketplace-listings.ts)
 * — this one never touches reviewed_at/rejection_reason (those are moderation-only concepts) and
 * enforces SELF_SERVICE_TRANSITIONS so a stale/reused link can't skip straight from "pending" to
 * "sold", or resurrect a "removed" listing.
 */
export async function updateManagedListingStatus(rawToken: string, nextStatus: MarketplaceListingStatus): Promise<UpdateManagedListingStatusResult> {
  const listing = await getManagedListingByToken(rawToken);
  if (!listing) return { success: false, reason: "not-found" };
  if (!isValidSelfServiceTransition(listing.status, nextStatus)) {
    return { success: false, reason: "invalid-transition" };
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("marketplace_listings")
    .update({ status: nextStatus, updated_at: new Date().toISOString(), management_token_last_used_at: new Date().toISOString() })
    .eq("id", listing.id)
    .select("*")
    .single();
  if (error) {
    console.error("[updateManagedListingStatus] failed:", error.message);
    return { success: false, reason: "not-found" };
  }

  return { success: true, listing: data, previousStatus: listing.status };
}

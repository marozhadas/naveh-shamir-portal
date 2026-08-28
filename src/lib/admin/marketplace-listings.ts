import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { generateManagementToken, hashManagementToken } from "@/utils/marketplace-management-token";
import type { MarketplaceListingRow, MarketplaceListingStatus } from "@/types/marketplace";

export async function listAllMarketplaceListings(): Promise<MarketplaceListingRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPendingMarketplaceListings(limit?: number): Promise<MarketplaceListingRow[]> {
  const supabase = createAdminSupabaseClient();
  let query = supabase.from("marketplace_listings").select("*").eq("status", "pending").order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countPendingMarketplaceListings(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase.from("marketplace_listings").select("*", { count: "exact", head: true }).eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getMarketplaceListingById(id: string): Promise<MarketplaceListingRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("marketplace_listings").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export type MarketplaceListingEditableFields = {
  title: string;
  description: string;
  category_id: string;
  is_free: boolean;
  price: number | null;
  condition: string | null;
  area: string | null;
  contact_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
};

/** Admin edit — separate from updateMarketplaceListingStatus (which only ever touches status/review fields) so a status change can never accidentally overwrite listing content, and vice versa. */
export async function updateMarketplaceListingFields(id: string, fields: MarketplaceListingEditableFields): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("marketplace_listings")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateMarketplaceListingStatus(
  id: string,
  status: MarketplaceListingStatus,
  extra: { rejection_reason?: string | null } = {},
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("marketplace_listings")
    .update({ status, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...extra })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Issues a brand-new management token, invalidating whatever the poster had before (their old
 * link stops working the instant this runs — its hash is overwritten, not kept alongside).
 * The admin never learns the PREVIOUS raw token (it was never stored anywhere to begin with —
 * only its hash), but this new one is returned once, here, since the admin is the one who has to
 * relay it to the poster (e.g. if the original link was lost or exposed).
 */
export async function rotateMarketplaceManagementToken(id: string): Promise<{ rawToken: string; listing: MarketplaceListingRow }> {
  const supabase = createAdminSupabaseClient();
  const rawToken = generateManagementToken();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .update({
      management_token_hash: hashManagementToken(rawToken),
      management_token_created_at: new Date().toISOString(),
      management_token_last_used_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { rawToken, listing: data };
}

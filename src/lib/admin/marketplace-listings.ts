import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
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

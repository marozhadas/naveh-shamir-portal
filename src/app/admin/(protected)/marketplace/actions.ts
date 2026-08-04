"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { getMarketplaceListingById, updateMarketplaceListingStatus } from "@/lib/admin/marketplace-listings";
import type { MarketplaceListingStatus } from "@/types/marketplace";

async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
}

function revalidateMarketplaceViews(listingId: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/marketplace");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${listingId}`);
}

export async function approveMarketplaceListingAction(listingId: string): Promise<void> {
  await requireAdmin();
  const listing = await getMarketplaceListingById(listingId);
  if (!listing) throw new Error("המודעה לא נמצאה.");
  await updateMarketplaceListingStatus(listingId, "active");
  revalidateMarketplaceViews(listingId);
}

export async function rejectMarketplaceListingAction(listingId: string): Promise<void> {
  await requireAdmin();
  const listing = await getMarketplaceListingById(listingId);
  if (!listing) throw new Error("המודעה לא נמצאה.");
  await updateMarketplaceListingStatus(listingId, "removed", { rejection_reason: "נדחתה על ידי הצוות" });
  revalidateMarketplaceViews(listingId);
}

export async function setMarketplaceListingStatusAction(listingId: string, status: MarketplaceListingStatus): Promise<void> {
  await requireAdmin();
  const listing = await getMarketplaceListingById(listingId);
  if (!listing) throw new Error("המודעה לא נמצאה.");
  await updateMarketplaceListingStatus(listingId, status);
  revalidateMarketplaceViews(listingId);
}

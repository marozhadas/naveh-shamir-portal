"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import {
  getMarketplaceListingById,
  rotateMarketplaceManagementToken,
  updateMarketplaceListingFields,
  updateMarketplaceListingStatus,
} from "@/lib/admin/marketplace-listings";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { buildManagementUrl } from "@/utils/marketplace-management-token";
import { getSiteOrigin } from "@/utils/site-origin";
import type { MarketplaceListingEditableFields } from "@/lib/admin/marketplace-listings";
import type { MarketplaceListingStatus } from "@/types/marketplace";

async function requireAdmin(): Promise<string> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
  return getAdminId();
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

export async function updateMarketplaceListingFieldsAction(listingId: string, fields: MarketplaceListingEditableFields): Promise<void> {
  await requireAdmin();
  const listing = await getMarketplaceListingById(listingId);
  if (!listing) throw new Error("המודעה לא נמצאה.");
  await updateMarketplaceListingFields(listingId, fields);
  revalidateMarketplaceViews(listingId);
}

/**
 * Issues a fresh management link and immediately invalidates the poster's old one — for when a
 * link was lost or may have been exposed. The admin sees this new raw token exactly once, in the
 * action's own return value, so they can relay it to the poster; it is never written anywhere
 * (the DB only ever stores its hash) and this action can never retrieve a PREVIOUSLY issued raw
 * token — there is no way to recover one that already exists, by design.
 */
export async function rotateMarketplaceManagementTokenAction(listingId: string): Promise<{ managementUrl: string }> {
  const adminId = await requireAdmin();
  const listing = await getMarketplaceListingById(listingId);
  if (!listing) throw new Error("המודעה לא נמצאה.");
  const { rawToken } = await rotateMarketplaceManagementToken(listingId);
  await recordAuditLog({ adminId, action: "marketplace-listing-management-token-rotated", entityType: "marketplace-listing", entityId: listingId, metadata: { title: listing.title } });
  return { managementUrl: buildManagementUrl(getSiteOrigin(), rawToken) };
}

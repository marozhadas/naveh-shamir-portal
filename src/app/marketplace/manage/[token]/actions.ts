"use server";

import { revalidatePath } from "next/cache";
import { updateManagedListingStatus } from "@/repositories/marketplace-management-service";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";
import type { MarketplaceListingRow, MarketplaceListingStatus } from "@/types/marketplace";

const UPDATE_RATE_LIMIT_MAX = 20;
const UPDATE_RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes

export type UpdateManagedListingActionResult =
  | { success: true; listing: MarketplaceListingRow }
  | { success: false; message: string };

const AUDIT_ACTION_BY_STATUS: Partial<Record<MarketplaceListingStatus, "marketplace-listing-marked-sold" | "marketplace-listing-marked-given" | "marketplace-listing-restored">> = {
  sold: "marketplace-listing-marked-sold",
  delivered: "marketplace-listing-marked-given",
  active: "marketplace-listing-restored",
};

/**
 * The only server entry point a poster's management link can reach — everything here is gated on
 * `token`, never a listingId (see updateManagedListingStatus's own SELF_SERVICE_TRANSITIONS
 * guard for which status changes are even reachable this way). No admin session is checked or
 * required; that's the entire point of this flow. `token` itself must never appear in the
 * returned message, in `console`, or in the audit log metadata below — only the DB's hash lookup
 * ever sees it.
 */
export async function updateManagedListingStatusAction(token: string, nextStatus: MarketplaceListingStatus): Promise<UpdateManagedListingActionResult> {
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`marketplace-manage-update:${ip}`, UPDATE_RATE_LIMIT_MAX, UPDATE_RATE_LIMIT_WINDOW_SECONDS);
  if (!allowed) {
    return { success: false, message: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." };
  }

  const result = await updateManagedListingStatus(token, nextStatus);
  if (!result.success) {
    // Deliberately the same generic message for "no such token" and "status change not allowed
    // from here" — neither should let someone probing this endpoint distinguish a real link from
    // a guessed one, or learn anything about a listing's current state.
    return { success: false, message: "הקישור אינו תקין או שהפעולה אינה זמינה כרגע." };
  }

  const auditAction = AUDIT_ACTION_BY_STATUS[nextStatus];
  if (auditAction) {
    await recordAuditLog({
      adminId: null,
      action: auditAction,
      entityType: "marketplace-listing",
      entityId: result.listing.id,
      metadata: { previousStatus: result.previousStatus, newStatus: nextStatus, source: "management-link" },
    });
  }

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${result.listing.slug}`);

  return { success: true, listing: result.listing };
}

"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { getReviewById, setReviewStatus, deleteReview } from "@/lib/admin/business-reviews";
import { getRegistrationById } from "@/lib/admin/business-registrations";
import { recordAuditLog } from "@/lib/admin/audit-log";

async function requireAdmin(): Promise<string> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
  return getAdminId();
}

async function revalidateReviewViews(businessId: string): Promise<void> {
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  revalidatePath("/businesses");
  const business = await getRegistrationById(businessId);
  if (business?.slug) revalidatePath(`/businesses/${business.slug}`);
}

/**
 * The only place a review is ever moved to "approved" — always via an authenticated admin
 * session (requireAdmin), never a business owner's own action (no such action exists anywhere in
 * the app), satisfying "בעל עסק לא יכול לאשר ביקורות על עצמו" structurally rather than by a
 * runtime check.
 */
export async function approveReviewAction(reviewId: string): Promise<void> {
  const adminId = await requireAdmin();
  const review = await getReviewById(reviewId);
  if (!review) throw new Error("הביקורת לא נמצאה.");

  await setReviewStatus(reviewId, "approved");
  await recordAuditLog({
    adminId,
    action: "review-approved",
    entityType: "business-review",
    entityId: reviewId,
    metadata: { businessId: review.business_id, authorName: review.author_name },
  });

  await revalidateReviewViews(review.business_id);
}

export async function rejectReviewAction(reviewId: string): Promise<void> {
  const adminId = await requireAdmin();
  const review = await getReviewById(reviewId);
  if (!review) throw new Error("הביקורת לא נמצאה.");

  await setReviewStatus(reviewId, "rejected");
  await recordAuditLog({
    adminId,
    action: "review-rejected",
    entityType: "business-review",
    entityId: reviewId,
    metadata: { businessId: review.business_id, authorName: review.author_name },
  });

  await revalidateReviewViews(review.business_id);
}

export async function deleteReviewAction(reviewId: string): Promise<void> {
  const adminId = await requireAdmin();
  const review = await getReviewById(reviewId);
  if (!review) throw new Error("הביקורת לא נמצאה.");

  await deleteReview(reviewId);
  await recordAuditLog({
    adminId,
    action: "review-deleted",
    entityType: "business-review",
    entityId: reviewId,
    metadata: { businessId: review.business_id, authorName: review.author_name, status: review.status },
  });

  await revalidateReviewViews(review.business_id);
}

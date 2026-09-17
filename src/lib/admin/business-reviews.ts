import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { BusinessReviewRow, BusinessReviewStatus } from "@/types/business-review";

export type AdminReviewRow = BusinessReviewRow & { businessName: string };

/** Admin-only — joins in the business name so the list/detail views never need a second round trip per row. */
export async function listAllReviewsForAdmin(): Promise<AdminReviewRow[]> {
  const admin = createAdminSupabaseClient();
  const { data: reviews, error } = await admin.from("business_reviews").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!reviews || reviews.length === 0) return [];

  const businessIds = Array.from(new Set(reviews.map((r) => r.business_id)));
  const { data: businesses } = await admin.from("business_registrations").select("id, business_name").in("id", businessIds);
  const nameById = new Map((businesses ?? []).map((b) => [b.id, b.business_name]));

  return reviews.map((review) => ({ ...review, businessName: nameById.get(review.business_id) ?? "(עסק לא ידוע)" }));
}

export async function countPendingReviews(): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { count, error } = await admin.from("business_reviews").select("*", { count: "exact", head: true }).eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getReviewById(id: string): Promise<BusinessReviewRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("business_reviews").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function setReviewStatus(id: string, status: BusinessReviewStatus, rejectionReason?: string | null): Promise<BusinessReviewRow> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("business_reviews")
    .update({ status, reviewed_at: new Date().toISOString(), rejection_reason: rejectionReason ?? null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteReview(id: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("business_reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

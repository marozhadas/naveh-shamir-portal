import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { BusinessReviewRow } from "@/types/business-review";

/**
 * Public-facing read — uses the anon/publishable client so RLS itself enforces "approved only"
 * (the "public can read approved reviews" policy), not just an application-level filter. Defense
 * in depth: even a bug in the calling code could never leak a pending/rejected review's content.
 */
export async function getApprovedReviewsForBusiness(businessId: string): Promise<BusinessReviewRow[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("business_reviews")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export type SubmitReviewResult = { success: true } | { success: false };

/**
 * Public-facing insert — same anon client, whose RLS insert policy only ever allows
 * status="pending" (never pre-approved). Ownership/eligibility (does this business exist, is it
 * Plus/Premium) is the caller's responsibility (submitBusinessReviewAction) — this function only
 * performs the write.
 */
export async function submitBusinessReview(businessId: string, authorName: string, content: string): Promise<SubmitReviewResult> {
  try {
    const supabase = createPublicSupabaseClient();
    const { error } = await supabase.from("business_reviews").insert({
      business_id: businessId,
      author_name: authorName,
      content,
      status: "pending",
    });
    if (error) {
      console.error("[submitBusinessReview] insert failed:", error.message);
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.error("[submitBusinessReview] unexpected error:", error);
    return { success: false };
  }
}

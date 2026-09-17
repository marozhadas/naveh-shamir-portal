export type BusinessReviewStatus = "pending" | "approved" | "rejected";

/** Mirrors the public.business_reviews table (see create_business_reviews_table migration). */
export type BusinessReviewRow = {
  id: string;
  business_id: string;
  author_name: string;
  content: string;
  status: BusinessReviewStatus;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export const BUSINESS_REVIEW_STATUS_LABEL: Record<BusinessReviewStatus, string> = {
  pending: "ממתינה לאישור",
  approved: "מאושרת",
  rejected: "נדחתה",
};

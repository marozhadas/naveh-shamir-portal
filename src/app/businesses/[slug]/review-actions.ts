"use server";

import { z } from "zod";
import { sanitizeEditorText } from "@/editor/utils/sanitize-editor-content";
import { countWords, MAX_REVIEW_WORDS } from "@/utils/word-count";
import { submitBusinessReview } from "@/repositories/business-review-service";
import { getRegistrationById } from "@/lib/admin/business-registrations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";

export type SubmitReviewState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

const GENERIC_ERROR_MESSAGE = "לא הצלחנו לשלוח את הביקורת כרגע. אפשר לנסות שוב בעוד רגע.";

const reviewSchema = z.object({
  authorName: z.string().trim().min(1, "יש להזין שם").max(80, "השם ארוך מדי — עד 80 תווים"),
  content: z
    .string()
    .trim()
    .min(1, "יש להזין תוכן לביקורת")
    .refine((text) => countWords(text) <= MAX_REVIEW_WORDS, `הביקורת ארוכה מדי — עד ${MAX_REVIEW_WORDS} מילים`),
});

/**
 * `businessId` is always the raw registration id, bound server-side by the caller
 * (WriteReviewForm binds it via .bind(null, businessId)) — it's not read from the form itself, so
 * a visitor can't submit a review under a different business's id than the one the form was
 * actually rendered for... except a determined client COULD still call this action directly with
 * any businessId, which is exactly why eligibility is re-checked below instead of trusting that
 * the UI only rendered this form when canShowReviews was true.
 */
export async function submitBusinessReviewAction(businessId: string, _prevState: SubmitReviewState, formData: FormData): Promise<SubmitReviewState> {
  // Hidden field real visitors never fill; a bot that fills every field usually does. Silently
  // pretends success instead of tipping the bot off (same pattern as the business/marketplace forms).
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot) return { status: "success" };

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`business-review-submit:${ip}`, 5, 3600);
  if (!allowed) return { status: "error", message: "יותר מדי ביקורות נשלחו מהכתובת הזו. אפשר לנסות שוב בעוד כמה שעות." };

  const raw = {
    authorName: typeof formData.get("authorName") === "string" ? (formData.get("authorName") as string) : "",
    content: typeof formData.get("content") === "string" ? (formData.get("content") as string) : "",
  };
  const result = reviewSchema.safeParse(raw);
  if (!result.success) {
    return { status: "error", message: "יש לתקן את השדות המסומנים", fieldErrors: result.error.flatten().fieldErrors };
  }

  // Defense in depth — re-verify server-side that this business can actually receive reviews
  // (approved + Plus/Premium) rather than trusting that the page only ever rendered this form
  // when canShowReviews was true.
  let registration;
  try {
    registration = await getRegistrationById(businessId);
  } catch (error) {
    console.error("[submitBusinessReviewAction] eligibility lookup failed:", error);
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }
  if (!registration || registration.status !== "approved" || registration.active_plan_id === "basic") {
    return { status: "error", message: "לא ניתן לשלוח ביקורת לעסק זה כרגע." };
  }

  const authorName = sanitizeEditorText(result.data.authorName);
  const content = sanitizeEditorText(result.data.content);
  if (!authorName || !content) return { status: "error", message: "יש למלא את כל השדות." };

  const submitResult = await submitBusinessReview(businessId, authorName, content);
  if (!submitResult.success) {
    // Never surface the underlying DB error to a public form.
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  return { status: "success" };
}

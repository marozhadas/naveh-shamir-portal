"use server";

import { redirect } from "next/navigation";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";

export type StartTrialActionState = { error: string | null };

const ELIGIBILITY_ERROR_MESSAGES: Record<string, string> = {
  "not-authenticated": "יש להתחבר כבעל/ת העסק כדי להפעיל את הניסיון.",
  "business-not-found": "העסק לא נמצא.",
  "business-not-owned": "העסק הזה אינו רשום תחת החשבון המחובר.",
  "business-not-approved": "העסק טרם אושר על ידי הצוות שלנו. יש להמתין לאישור הרישום לפני הפעלת הניסיון.",
  "trial-already-used": "תקופת הניסיון החינמית כבר נוצלה עבור העסק הזה בעבר, ולא ניתן להפעיל אותה שוב.",
  "active-subscription": "כבר קיים מנוי פעיל לעסק הזה.",
  "subscription-not-eligible": "אירעה תקלה בבדיקת הזכאות. נסו שוב בעוד כמה רגעים.",
  "invalid-slug": "לפני הפעלת עמוד העסק, הצוות שלנו צריך להגדיר כתובת URL לעסק. נציג/ת הפורטל ייצור/תיצור איתך קשר.",
};
const GENERIC_ERROR_MESSAGE = "אירעה תקלה בהפעלת הניסיון. נסו שוב בעוד כמה רגעים.";

/**
 * Every check is re-verified here, server-side, right before anything is written (spec section
 * 11: never trust the client) — the consent checkbox is enforced here too, not just via the
 * form's HTML `required` attribute. Eligibility now goes through subscriptionRepository, which
 * re-derives ownership/approval/one-time-use straight from the database for real Supabase
 * businesses (see checkRealTrialEligibility) rather than trusting anything computed earlier in
 * the request.
 */
export async function startTrialAction(_prevState: StartTrialActionState, formData: FormData): Promise<StartTrialActionState> {
  const user = await authAdapter.getCurrentUser();
  if (!user) {
    return { error: ELIGIBILITY_ERROR_MESSAGES["not-authenticated"] };
  }

  const consent = formData.get("consent");
  if (consent !== "on") {
    return { error: "יש לאשר את תנאי השימוש ותנאי תקופת הניסיון כדי להמשיך." };
  }

  const businessId = user.ownedBusinessIds[0];
  if (!businessId) {
    return { error: "לא נמצא עסק המשויך לחשבון זה." };
  }

  const eligibility = await subscriptionRepository.checkTrialEligibility(businessId, user);
  if (!eligibility.eligible) {
    return { error: ELIGIBILITY_ERROR_MESSAGES[eligibility.reason] ?? GENERIC_ERROR_MESSAGE };
  }

  try {
    await subscriptionRepository.createTrial(businessId, user.id);
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  redirect("/business/dashboard");
}

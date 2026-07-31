"use server";

import { redirect } from "next/navigation";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { checkTrialEligibility } from "@/domain/check-trial-eligibility";

export type StartTrialActionState = { error: string | null };

/**
 * Every check the domain layer defines is re-verified here, server-side, before anything is
 * written (spec section 11: never trust the client) — the consent checkbox is enforced here too,
 * not just in the form's HTML `required` attribute.
 */
export async function startTrialAction(_prevState: StartTrialActionState, formData: FormData): Promise<StartTrialActionState> {
  const user = await authAdapter.getCurrentUser();
  if (!user) {
    return { error: "יש להיכנס במצב הדגמה כבעל/ת עסק כדי להתחיל ניסיון." };
  }

  const consent = formData.get("consent");
  if (consent !== "on") {
    return { error: "יש לאשר את תנאי השימוש ותנאי תקופת הניסיון כדי להמשיך." };
  }

  const businessId = user.ownedBusinessIds[0];
  if (!businessId) {
    return { error: "לא נמצא עסק המשויך לחשבון זה." };
  }

  const business = await businessRepository.getDraftById(businessId, user.id);
  if (!business) {
    return { error: "העסק לא נמצא או שאינו בבעלותך." };
  }

  const existingSubscription = await subscriptionRepository.getByBusinessId(businessId);
  const eligibility = checkTrialEligibility(business, existingSubscription, user);
  if (!eligibility.eligible) {
    const messages: Record<string, string> = {
      "active-subscription": "כבר קיים מנוי פעיל לעסק הזה.",
      "trial-already-used": "תקופת הניסיון החינמית כבר נוצלה עבור העסק הזה בעבר.",
      "business-not-owned": "העסק הזה אינו בבעלותך.",
      "not-authenticated": "יש להיכנס כדי להתחיל ניסיון.",
    };
    return { error: messages[eligibility.reason] ?? "לא ניתן להתחיל ניסיון כרגע." };
  }

  await subscriptionRepository.createTrial(businessId, user.id);
  redirect("/business/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { getSubscriptionAccess } from "@/domain/get-subscription-access";
import { getBusinessSelfEditAccess } from "@/domain/get-business-self-edit-access";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";
import type { BusinessSelfEditAccess } from "@/domain/get-business-self-edit-access";

export type UpdateProfileActionState = { error: string | null; success: boolean };

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const SELF_EDIT_BLOCKED_MESSAGE: Record<Extract<BusinessSelfEditAccess, { eligible: false }>["reason"], string> = {
  "plan-not-eligible": "עדכון עצמאי של פרטי העסק זמין למנויי Plus ו-Premium בלבד.",
  "no-subscription": "לא נמצא מנוי פעיל לעסק זה. פנו לתמיכה אם זה לא צפוי.",
  "subscription-not-editable": "המנוי אינו פעיל כרגע, ולכן לא ניתן לערוך את פרטי העסק.",
  "already-edited-this-month": "כבר השתמשת באפשרות העריכה שלך לחודש הזה. ניתן יהיה לערוך שוב בחודש הבא.",
};

/**
 * Deliberately a plain settings form (name/description/contact fields), not the floating visual
 * page editor built for the homepage — a full visual editor for business pages is explicitly out
 * of scope for this phase. Every field is re-validated server-side; nothing here trusts the form
 * just because required/type attributes exist on the client.
 *
 * Enforces getBusinessSelfEditAccess server-side — never trusts a client-side "you can edit" state
 * — and only stamps the business's monthly-edit allowance (via updateBusiness) on an actual
 * successful save (spec: "Edit = שמירה מוצלחת בפועל", not merely opening the form).
 */
export async function updateProfileAction(_prevState: UpdateProfileActionState, formData: FormData): Promise<UpdateProfileActionState> {
  const user = await authAdapter.requireUser();
  const businessId = user.ownedBusinessIds[0];
  if (!businessId) return { error: "לא נמצא עסק המשויך לחשבון זה.", success: false };

  const business = await businessRepository.getDraftById(businessId, user.id);
  if (!business) return { error: "העסק לא נמצא או שאינו בבעלותך.", success: false };

  const subscription = await subscriptionRepository.getByBusinessId(businessId);
  const subscriptionAccess = subscription ? getSubscriptionAccess(subscription, new Date()) : null;
  const selfEditAccess = getBusinessSelfEditAccess({
    activePlanId: business.activePlanId ?? "basic",
    subscriptionAccess,
    lastSelfEditAt: business.lastSelfEditAt ?? null,
    now: new Date(),
  });
  if (!selfEditAccess.eligible) {
    return { error: SELF_EDIT_BLOCKED_MESSAGE[selfEditAccess.reason], success: false };
  }

  const name = readField(formData, "name");
  const shortDescription = readField(formData, "shortDescription");
  const fullDescription = readField(formData, "fullDescription");
  const phoneDigits = readField(formData, "phone");
  const whatsappDigits = readField(formData, "whatsappPhone");
  const websiteUrl = readField(formData, "websiteUrl");
  const address = readField(formData, "address");
  const serviceArea = readField(formData, "serviceArea");

  if (!name) return { error: "שם העסק לא יכול להיות ריק.", success: false };
  if (!fullDescription) return { error: "אודות העסק לא יכול להיות ריק.", success: false };
  if (phoneDigits && !/^\+?[0-9-]{6,}$/.test(phoneDigits)) {
    return { error: "מספר הטלפון אינו תקין.", success: false };
  }
  if (whatsappDigits && !/^\+?[0-9-]{6,}$/.test(whatsappDigits)) {
    return { error: "מספר הוואטסאפ אינו תקין.", success: false };
  }
  if (websiteUrl && !isSafeHrefOrEmpty(websiteUrl)) {
    return { error: "כתובת האתר אינה תקינה — יש להשתמש בקישור https://", success: false };
  }

  const updated = await businessRepository.updateBusiness(businessId, user.id, {
    name,
    shortDescription,
    fullDescription,
    phone: phoneDigits ? `tel:${phoneDigits.replace(/[^0-9+]/g, "")}` : "",
    whatsappUrl: whatsappDigits ? `https://wa.me/${whatsappDigits.replace(/[^0-9]/g, "")}` : "",
    websiteUrl,
    address,
    serviceArea,
  });

  if (!updated) {
    return { error: "לא הצלחנו לשמור את העדכון כרגע. נסו שוב בעוד רגע.", success: false };
  }

  revalidatePath("/business/dashboard");
  revalidatePath("/business/dashboard/profile");
  revalidatePath("/business/dashboard/preview");
  if (updated.slug) revalidatePath(`/businesses/${updated.slug}`);

  return { error: null, success: true };
}

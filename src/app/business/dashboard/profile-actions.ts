"use server";

import { revalidatePath } from "next/cache";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { businessRepository } from "@/repositories/mock-business-repository";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";

export type UpdateProfileActionState = { error: string | null; success: boolean };

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Deliberately a plain settings form (name/description/contact fields), not the floating visual
 * page editor built for the homepage — a full visual editor for business pages is explicitly out
 * of scope for this phase. Every field is re-validated server-side; nothing here trusts the form
 * just because required/type attributes exist on the client.
 */
export async function updateProfileAction(_prevState: UpdateProfileActionState, formData: FormData): Promise<UpdateProfileActionState> {
  const user = await authAdapter.requireUser();
  const businessId = user.ownedBusinessIds[0];
  if (!businessId) return { error: "לא נמצא עסק המשויך לחשבון זה.", success: false };

  const business = await businessRepository.getDraftById(businessId, user.id);
  if (!business) return { error: "העסק לא נמצא או שאינו בבעלותך.", success: false };

  const name = readField(formData, "name");
  const shortDescription = readField(formData, "shortDescription");
  const fullDescription = readField(formData, "fullDescription");
  const phoneDigits = readField(formData, "phone");
  const whatsappDigits = readField(formData, "whatsappPhone");
  const websiteUrl = readField(formData, "websiteUrl");
  const address = readField(formData, "address");
  const serviceArea = readField(formData, "serviceArea");

  if (!name) return { error: "שם העסק לא יכול להיות ריק.", success: false };
  if (phoneDigits && !/^\+?[0-9-]{6,}$/.test(phoneDigits)) {
    return { error: "מספר הטלפון אינו תקין.", success: false };
  }
  if (whatsappDigits && !/^\+?[0-9-]{6,}$/.test(whatsappDigits)) {
    return { error: "מספר הוואטסאפ אינו תקין.", success: false };
  }
  if (websiteUrl && !isSafeHrefOrEmpty(websiteUrl)) {
    return { error: "כתובת האתר אינה תקינה — יש להשתמש בקישור https://", success: false };
  }

  await businessRepository.updateBusiness(businessId, user.id, {
    name,
    shortDescription,
    fullDescription,
    phone: phoneDigits ? `tel:${phoneDigits.replace(/[^0-9+]/g, "")}` : "",
    whatsappUrl: whatsappDigits ? `https://wa.me/${whatsappDigits.replace(/[^0-9]/g, "")}` : "",
    websiteUrl,
    address,
    serviceArea,
  });

  revalidatePath("/business/dashboard");
  revalidatePath("/business/dashboard/profile");
  revalidatePath("/business/dashboard/preview");

  return { error: null, success: true };
}

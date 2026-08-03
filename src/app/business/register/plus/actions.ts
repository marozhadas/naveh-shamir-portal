"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { slugify } from "@/utils/slugify";
import { uploadBusinessMedia } from "@/repositories/business-media-service";
import { plusBusinessRegistrationSchema } from "./schema";
import type { PlusBusinessRegistrationInput } from "@/types/business-plus-registration";

export type UploadMediaActionState =
  | { success: true; url: string }
  | { success: false; message: string };

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  "not-configured": "העלאת תמונות אינה זמינה כרגע. נסו שוב מאוחר יותר.",
  "invalid-type": "יש להעלות קובץ JPG, PNG או WebP בלבד.",
  "too-large": "התמונה גדולה מדי — עד 5MB לתמונה.",
  "upload-failed": "העלאת התמונה נכשלה. נסו שוב.",
};

/** Called once per image the wizard's media step uploads — never gated by admin auth (see business-media-service.ts). */
export async function uploadBusinessMediaAction(
  registrationId: string,
  kind: "cover" | "gallery",
  formData: FormData,
): Promise<UploadMediaActionState> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "לא נבחר קובץ." };

  const result = await uploadBusinessMedia(registrationId, kind, file);
  if (!result.success) return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  return { success: true, url: result.url };
}

export type SubmitPlusRegistrationState = {
  status: "idle" | "validation-error" | "server-error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const GENERIC_SERVER_ERROR_MESSAGE = "לא הצלחנו לשמור את העסק כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * The single insert path for both /business/register/plus and (once wired) /business/register/premium
 * — `planId` is always a fixed argument from the caller, never trusted from the client payload alone
 * (this function re-validates the whole input, including planId, against plusBusinessRegistrationSchema
 * server-side regardless of what the client already checked).
 *
 * Deliberately does NOT start a trial or flip the business to "approved"/premium — spec: the free
 * month must only begin after an admin approves the registration AND a separate, explicit
 * activation happens (not yet built). Until then this only ever writes trial_status="not-started".
 */
export async function submitPlusRegistrationAction(
  input: PlusBusinessRegistrationInput,
  /** Hidden field real visitors never fill; a bot that fills every field usually does. Silently pretends success instead of tipping the bot off. */
  honeypot?: string,
): Promise<SubmitPlusRegistrationState> {
  if (honeypot) return { status: "success" };

  const result = plusBusinessRegistrationSchema.safeParse({
    ...input,
    instagramUrl: input.socialLinks.instagramUrl ?? "",
    facebookUrl: input.socialLinks.facebookUrl ?? "",
    tiktokUrl: input.socialLinks.tiktokUrl ?? "",
  });

  if (!result.success) {
    return {
      status: "validation-error",
      message: "יש כמה פרטים שצריך לתקן",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const values = result.data;
  const supabase = createPublicSupabaseClient();
  const baseSlug = slugify(values.businessName);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : slugify(values.businessName, randomSuffix());
    const { error } = await supabase.from("business_registrations").insert({
      id: values.registrationId,
      slug,
      business_name: values.businessName,
      category_id: values.categoryIds[0],
      category_ids: values.categoryIds,
      business_type: values.businessType,
      description: values.fullDescription,
      short_description: values.shortDescription,
      contact_name: values.contactName,
      phone: values.contactPhone,
      whatsapp_phone: values.publicWhatsapp || null,
      email: values.contactEmail,
      public_phone: values.publicPhone,
      public_whatsapp: values.publicWhatsapp || null,
      public_email: values.publicEmail || null,
      website_url: values.websiteUrl || null,
      address: values.address || null,
      service_area: values.serviceArea || null,
      address_type: values.addressType,
      cover_image: values.coverImage,
      gallery: values.gallery,
      services: values.services,
      opening_hours: values.openingHours,
      social_links: {
        instagramUrl: values.instagramUrl || undefined,
        facebookUrl: values.facebookUrl || undefined,
        tiktokUrl: values.tiktokUrl || undefined,
      },
      promotion: values.promotion,
      plan_tier: values.planId,
      trial_status: "not-started",
      publication_consent: values.publicationConsent,
      terms_accepted: values.termsAccepted,
      trial_consent: values.trialConsent,
      status: "pending",
      featured: false,
      verified: false,
    });

    if (!error) return { status: "success" };

    if (error.code === "23505") continue; // slug collision — retry with a suffixed slug
    console.error("[submitPlusRegistrationAction] insert failed:", error.code, error.message);
    return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE };
  }

  console.error("[submitPlusRegistrationAction] exhausted slug-collision retries");
  return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE };
}

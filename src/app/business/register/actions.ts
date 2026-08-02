"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";
import { slugify } from "@/utils/slugify";
import { BUSINESS_CATEGORIES } from "@/data/business-categories";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { getOpenNotificationForEntity } from "@/lib/admin/notifications";
import { sendRegistrationNotificationEmail } from "@/lib/email/send-registration-notification-email";

export type RegisterBusinessActionState = { error: string | null; success: boolean };

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** A short random suffix for slug de-duplication — not a security token, just a disambiguator. */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * Inserts a new registration as "pending" (RLS enforces this regardless of what we send — see
 * the create_business_registrations migration). It never becomes visible on the site until an
 * admin approves it from the hidden /admin page.
 */
export async function registerBusinessAction(
  _prevState: RegisterBusinessActionState,
  formData: FormData,
): Promise<RegisterBusinessActionState> {
  const businessName = readField(formData, "businessName");
  const categoryId = readField(formData, "categoryId");
  const description = readField(formData, "description");
  const shortDescription = readField(formData, "shortDescription");
  const contactName = readField(formData, "contactName");
  const phone = readField(formData, "phone");
  const whatsappPhone = readField(formData, "whatsappPhone");
  const email = readField(formData, "email");
  const websiteUrl = readField(formData, "websiteUrl");
  const address = readField(formData, "address");
  const serviceArea = readField(formData, "serviceArea");

  if (!businessName) return { error: "שם העסק לא יכול להיות ריק.", success: false };
  if (!BUSINESS_CATEGORIES.some((category) => category.id === categoryId)) {
    return { error: "יש לבחור קטגוריה מהרשימה.", success: false };
  }
  if (!description) return { error: "יש להוסיף תיאור לעסק.", success: false };
  if (!contactName) return { error: "יש להזין שם איש/אשת קשר.", success: false };
  if (!phone && !whatsappPhone && !email) {
    return { error: "יש להזין לפחות דרך התקשרות אחת (טלפון, וואטסאפ או אימייל).", success: false };
  }
  if (phone && !/^\+?[0-9-\s]{6,}$/.test(phone)) return { error: "מספר הטלפון אינו תקין.", success: false };
  if (whatsappPhone && !/^\+?[0-9-\s]{6,}$/.test(whatsappPhone)) {
    return { error: "מספר הוואטסאפ אינו תקין.", success: false };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "כתובת האימייל אינה תקינה.", success: false };
  if (websiteUrl && !isSafeHrefOrEmpty(websiteUrl)) {
    return { error: "כתובת האתר אינה תקינה — יש להשתמש בקישור https://", success: false };
  }

  const supabase = createPublicSupabaseClient();
  const baseSlug = slugify(businessName);

  // Try the plain slug first; retry a couple of times with a random suffix on a collision
  // (the unique constraint is the real guard — this just makes success on the first try common).
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : slugify(businessName, randomSuffix());
    // Generated here (not read back via `.select()`) on purpose: the anon role's SELECT policy on
    // this table only covers status="approved" rows, so asking PostgREST to return the just-inserted
    // "pending" row would itself get rejected by RLS. Knowing the id upfront avoids needing that read.
    const registrationId = randomUUID();
    const createdAt = new Date().toISOString();
    const { error } = await supabase.from("business_registrations").insert({
      id: registrationId,
      slug,
      business_name: businessName,
      category_id: categoryId,
      description,
      short_description: shortDescription || null,
      contact_name: contactName,
      phone: phone || null,
      whatsapp_phone: whatsappPhone || null,
      email: email || null,
      website_url: websiteUrl || null,
      address: address || null,
      service_area: serviceArea || null,
      status: "pending",
      featured: false,
      verified: false,
    });

    if (!error) {
      // Fire-and-forget: a slow or failed email must never delay or fail the registration itself,
      // which already succeeded above. `after()` runs this once the response has been sent.
      if (isSupabaseAdminConfigured()) {
        after(async () => {
          const notification = await getOpenNotificationForEntity("business-registration", registrationId);
          if (!notification) return;
          await sendRegistrationNotificationEmail({
            notificationId: notification.id,
            registrationId,
            businessName,
            categoryId,
            contactName,
            createdAt,
          });
        });
      }
      return { error: null, success: true };
    }
    // Postgres unique_violation — retry with a different slug.
    if (error.code !== "23505") {
      return { error: "לא ניתן היה לשלוח את ההרשמה כרגע. נסו שוב בעוד רגע.", success: false };
    }
  }

  return { error: "לא ניתן היה לשלוח את ההרשמה כרגע. נסו שוב בעוד רגע.", success: false };
}

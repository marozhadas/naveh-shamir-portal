"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { slugify } from "@/utils/slugify";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { getOpenNotificationForEntity } from "@/lib/admin/notifications";
import { sendRegistrationNotificationEmail } from "@/lib/email/send-registration-notification-email";
import { businessRegistrationSchema, EMPTY_FORM_VALUES, type BusinessRegistrationFormValues } from "./schema";
import type { BusinessPlanTier } from "@/data/business-plans";

export type BusinessRegistrationActionState = {
  status: "idle" | "validation-error" | "server-error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof BusinessRegistrationFormValues, string[]>>;
  values: BusinessRegistrationFormValues;
};

const GENERIC_SERVER_ERROR_MESSAGE = "לא הצלחנו לשמור את העסק כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readFormValues(formData: FormData): BusinessRegistrationFormValues {
  return {
    businessName: readField(formData, "businessName"),
    categoryId: readField(formData, "categoryId"),
    shortDescription: readField(formData, "shortDescription"),
    description: readField(formData, "description"),
    contactName: readField(formData, "contactName"),
    phone: readField(formData, "phone"),
    whatsappPhone: readField(formData, "whatsappPhone"),
    email: readField(formData, "email"),
    websiteUrl: readField(formData, "websiteUrl"),
    address: readField(formData, "address"),
    serviceArea: readField(formData, "serviceArea"),
  };
}

/** A short random suffix for slug de-duplication — not a security token, just a disambiguator. */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * Inserts a new registration as "pending" (RLS enforces this regardless of what we send — see
 * the create_business_registrations migration). It never becomes visible on the site until an
 * admin approves it from the hidden /admin page.
 *
 * On any failure (validation or server), the submitted values are always returned in `values` so
 * the client never has to guess-and-refill — see RegisterBusinessForm.tsx for how that's used.
 *
 * `planTier` is never read from the client — it's a fixed argument each route's own action passes
 * (see business/register/plus/actions.ts, business/register/premium/actions.ts), so a visitor can
 * never submit an arbitrary tier through the form itself.
 */
export async function submitBusinessRegistration(
  formData: FormData,
  planTier: BusinessPlanTier,
): Promise<BusinessRegistrationActionState> {
  const raw = readFormValues(formData);
  const result = businessRegistrationSchema.safeParse(raw);

  if (!result.success) {
    return {
      status: "validation-error",
      message: "יש כמה פרטים שצריך לתקן",
      fieldErrors: result.error.flatten().fieldErrors,
      values: raw,
    };
  }

  const values = result.data;
  const supabase = createPublicSupabaseClient();
  const baseSlug = slugify(values.businessName);

  // Try the plain slug first; retry a couple of times with a random suffix on a collision
  // (the unique constraint is the real guard — this just makes success on the first try common).
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : slugify(values.businessName, randomSuffix());
    // Generated here (not read back via `.select()`) on purpose: the anon role's SELECT policy on
    // this table only covers status="approved" rows, so asking PostgREST to return the just-inserted
    // "pending" row would itself get rejected by RLS. Knowing the id upfront avoids needing that read.
    const registrationId = randomUUID();
    const createdAt = new Date().toISOString();
    const { error } = await supabase.from("business_registrations").insert({
      id: registrationId,
      slug,
      business_name: values.businessName,
      category_id: values.categoryId,
      description: values.description,
      short_description: values.shortDescription || null,
      contact_name: values.contactName,
      phone: values.phone || null,
      whatsapp_phone: values.whatsappPhone || null,
      email: values.email || null,
      website_url: values.websiteUrl || null,
      address: values.address || null,
      service_area: values.serviceArea || null,
      status: "pending",
      featured: false,
      verified: false,
      plan_tier: planTier,
      // Every fresh registration starts inactive — activated later by a trial (startRealBusinessTrial)
      // or an admin (changeBusinessPlanAction), never at registration time itself.
      active_plan_id: "basic",
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
            businessName: values.businessName,
            categoryId: values.categoryId,
            contactName: values.contactName,
            createdAt,
          });
        });
      }
      return { status: "success", values: EMPTY_FORM_VALUES };
    }

    // Postgres unique_violation — retry with a different slug, not a real error to report.
    if (error.code !== "23505") {
      // Technical detail stays server-side only — never surfaced to the visitor.
      console.error("[registerBusinessAction] insert failed:", error.code, error.message);
      return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE, values: raw };
    }
  }

  console.error("[registerBusinessAction] exhausted slug-collision retries");
  return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE, values: raw };
}

/** The free-plan registration action — unchanged signature/behavior, used by business/register/page.tsx. */
export async function registerBusinessAction(
  _prevState: BusinessRegistrationActionState,
  formData: FormData,
): Promise<BusinessRegistrationActionState> {
  return submitBusinessRegistration(formData, "free");
}

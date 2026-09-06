import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { hashManagementToken } from "@/utils/management-token";
import { checkBusinessManagementEligibility } from "@/utils/business-management-access";
import type { BusinessManagementEditValues } from "@/app/business/manage/[token]/schema";
import type { BusinessRegistrationRow } from "@/types/business-registration";

/**
 * Looks up a business registration by its management token — the ONLY lookup path for this flow,
 * deliberately raw-token -> hash -> DB equality, never a query against a raw token column (there
 * isn't one). Uses the service-role admin client, not the public/anon client: possession of the
 * token IS the authorization here. Deliberately does NOT check eligibility (approved/premium/
 * consent) itself — callers that need to gate on that call checkBusinessManagementEligibility
 * separately, so a page can tell "wrong token" and "right token, no longer eligible" apart.
 */
export async function getManagedBusinessByToken(rawToken: string): Promise<BusinessRegistrationRow | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminSupabaseClient();
  const tokenHash = hashManagementToken(rawToken);
  const { data, error } = await admin.from("business_registrations").select("*").eq("management_token_hash", tokenHash).maybeSingle();
  if (error) {
    console.error("[getManagedBusinessByToken] failed:", error.message);
    return null;
  }
  return data;
}

/** Touches management_token_last_used_at without changing anything else — called whenever a valid token is used, whether just viewing the manage page or saving an edit. */
export async function touchBusinessManagementTokenLastUsed(businessId: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("business_registrations")
    .update({ management_token_last_used_at: new Date().toISOString() })
    .eq("id", businessId);
  if (error) console.error("[touchBusinessManagementTokenLastUsed] failed:", error.message);
}

export type UpdateManagedBusinessFieldsResult =
  | { success: true; registration: BusinessRegistrationRow }
  | { success: false; reason: "not-found" | "not-eligible" };

/**
 * Deliberately separate from the admin's updateRegistrationFields (src/lib/admin/business-registrations.ts)
 * — this one only ever touches the content fields a Premium owner is allowed to self-edit (see
 * businessManagementEditSchema), never status/plan/consent/slug/featured/verified. Re-checks
 * eligibility live (not just "does the token resolve") so a business downgraded or unapproved after
 * a token was issued loses edit access immediately, without anyone needing to remember to revoke it.
 */
export async function updateManagedBusinessFields(rawToken: string, values: BusinessManagementEditValues): Promise<UpdateManagedBusinessFieldsResult> {
  const registration = await getManagedBusinessByToken(rawToken);
  if (!registration) return { success: false, reason: "not-found" };
  if (!checkBusinessManagementEligibility(registration).eligible) return { success: false, reason: "not-eligible" };

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("business_registrations")
    .update({
      business_name: values.businessName,
      category_id: values.categoryIds[0],
      category_ids: values.categoryIds,
      business_type: values.businessType,
      description: values.fullDescription,
      short_description: values.shortDescription,
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
      testimonials: values.testimonials.length > 0 ? values.testimonials : null,
      opening_hours: values.openingHours,
      social_links: {
        instagramUrl: values.instagramUrl || undefined,
        facebookUrl: values.facebookUrl || undefined,
        tiktokUrl: values.tiktokUrl || undefined,
      },
      promotion: values.promotion,
      management_token_last_used_at: new Date().toISOString(),
    })
    .eq("id", registration.id)
    .select("*")
    .single();

  if (error) {
    console.error("[updateManagedBusinessFields] failed:", error.message);
    return { success: false, reason: "not-found" };
  }

  return { success: true, registration: data };
}

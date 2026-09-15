import { ALL_BUSINESSES } from "@/data/all-businesses";
import { getRelatedBusinesses } from "@/utils/get-related-businesses";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { mapRegistrationToBusiness } from "@/utils/map-registration-to-business";
import { isSupabaseBusinessId, toRegistrationId } from "@/utils/business-id";
import type { Business } from "@/types/business";
import type { BusinessPublicationStatus } from "@/types/business-status";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import type { BusinessRepository } from "./business-repository";

type EditableBusinessFields = Pick<
  Business,
  "name" | "shortDescription" | "fullDescription" | "phone" | "whatsappUrl" | "websiteUrl" | "address" | "serviceArea"
>;

/**
 * Reads approved registrations from Supabase (RLS already restricts the public/publishable
 * client to status="approved" rows — see the create_business_registrations migration). Never
 * throws: if Supabase isn't configured or the request fails, the site still works with the
 * static demo businesses, it just won't show any real registrations yet.
 */
async function getApprovedSupabaseBusinesses(): Promise<Business[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("business_registrations").select("*").eq("status", "approved");
    if (error || !data) return [];
    return data.map(mapRegistrationToBusiness);
  } catch {
    return [];
  }
}

/**
 * Owner-scoped read of a Supabase registration regardless of status (pending/approved/rejected) —
 * used by the real trial/dashboard flow, which must show an owner their own registration even
 * before it's approved. Uses the service-role client with an explicit owner_id filter (rather than
 * a session-bound RLS client) to match this codebase's established pattern for server-only reads.
 */
async function getSupabaseBusinessForOwner(registrationId: string, ownerId: string): Promise<Business | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("business_registrations").select("*").eq("id", registrationId).eq("owner_id", ownerId).maybeSingle();
  if (error || !data) return null;
  return mapRegistrationToBusiness(data);
}

/**
 * In-memory static demo data (see src/data/all-businesses.ts) merged with real, admin-approved
 * registrations from Supabase — the static list is unaffected either way, so the already-shipped
 * demo experience keeps working even if Supabase is briefly unreachable.
 */
export class MockBusinessRepository implements BusinessRepository {
  private readonly store: Business[] = ALL_BUSINESSES;

  /**
   * Public-facing — deliberately does NOT read `this.store` (the static demo/seed businesses).
   * That store still backs the owner-dashboard/mock-trial simulation below (getDraftById,
   * getByOwnerId, ...), but real visitors must only ever see admin-approved Supabase
   * registrations, never invented demo listings.
   */
  async getPublishedBySlug(slug: string): Promise<Business | null> {
    const approved = await getApprovedSupabaseBusinesses();
    return approved.find((entry) => entry.slug === slug) ?? null;
  }

  /** Returns the business regardless of status — used by owner/admin preview, which must see drafts too. */
  async getBySlugUnfiltered(slug: string): Promise<Business | null> {
    const mockMatch = this.store.find((entry) => entry.slug === slug);
    if (mockMatch) return mockMatch;

    if (!isSupabaseAdminConfigured()) return null;
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("business_registrations").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) return null;
    return mapRegistrationToBusiness(data);
  }

  async getByOwnerId(ownerId: string): Promise<Business[]> {
    const mockMatches = this.store.filter((entry) => entry.ownerId === ownerId);
    if (!isSupabaseAdminConfigured()) return mockMatches;

    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("business_registrations").select("*").eq("owner_id", ownerId);
    return [...mockMatches, ...(data ?? []).map(mapRegistrationToBusiness)];
  }

  async getDraftById(businessId: string, ownerId: string): Promise<Business | null> {
    if (isSupabaseBusinessId(businessId)) {
      return getSupabaseBusinessForOwner(toRegistrationId(businessId), ownerId);
    }
    const business = this.store.find((entry) => entry.id === businessId);
    if (!business || business.ownerId !== ownerId) return null;
    return business;
  }

  /** Public-facing (see getPublishedBySlug's note) — never suggests a demo business as "related" to a real one. */
  async getRelated(business: Business, limit: number): Promise<Business[]> {
    const approved = await getApprovedSupabaseBusinesses();
    return getRelatedBusinesses(business, approved, limit);
  }

  /** Public-facing (see getPublishedBySlug's note) — the archive (/businesses) only ever lists real, admin-approved businesses. */
  async getAllPublished(): Promise<Business[]> {
    return getApprovedSupabaseBusinesses();
  }

  /**
   * Not part of the BusinessRepository interface (spec's suggested shape doesn't include a
   * write path) — added because the dashboard's profile-edit form needs somewhere real to save
   * to. Ownership is re-checked here too, not just by the caller (`.eq("owner_id", ownerId)` for
   * real businesses, an explicit `ownerId` match for mock ones).
   *
   * Always stamps `last_self_edit_at` to "now" on a successful write — this is the ONE call site
   * for that column outside the admin write path (updateRegistrationFields), which never touches
   * it, so an admin's own edits never consume a business's monthly self-edit allowance. The caller
   * (updateProfileAction) is responsible for checking getBusinessSelfEditAccess BEFORE calling
   * this — by the time this runs, eligibility has already been confirmed.
   *
   * Real (Supabase-backed) businesses write to `public_phone`/`public_whatsapp` — the fields the
   * public profile page actually displays (map-registration-to-business.ts) — not the internal
   * `phone`/`whatsapp_phone` contact columns, which represent a separate internal contact person.
   */
  async updateBusiness(businessId: string, ownerId: string, patch: Partial<EditableBusinessFields>): Promise<Business | null> {
    if (isSupabaseBusinessId(businessId)) {
      if (!isSupabaseAdminConfigured()) return null;
      const admin = createAdminSupabaseClient();
      const registrationId = toRegistrationId(businessId);

      const dbPatch: Partial<BusinessRegistrationRow> = { last_self_edit_at: new Date().toISOString() };
      if (patch.name !== undefined) dbPatch.business_name = patch.name;
      if (patch.shortDescription !== undefined) dbPatch.short_description = patch.shortDescription || null;
      if (patch.fullDescription !== undefined) dbPatch.description = patch.fullDescription;
      if (patch.phone !== undefined) dbPatch.public_phone = patch.phone ? patch.phone.replace(/^tel:/, "") : null;
      if (patch.whatsappUrl !== undefined) dbPatch.public_whatsapp = patch.whatsappUrl ? patch.whatsappUrl.replace(/^https:\/\/wa\.me\//, "") : null;
      if (patch.websiteUrl !== undefined) dbPatch.website_url = patch.websiteUrl || null;
      if (patch.address !== undefined) dbPatch.address = patch.address || null;
      if (patch.serviceArea !== undefined) dbPatch.service_area = patch.serviceArea || null;

      const { data, error } = await admin
        .from("business_registrations")
        .update(dbPatch)
        .eq("id", registrationId)
        .eq("owner_id", ownerId)
        .select("*")
        .maybeSingle();
      if (error || !data) return null;
      return mapRegistrationToBusiness(data);
    }

    const index = this.store.findIndex((entry) => entry.id === businessId && entry.ownerId === ownerId);
    if (index === -1) return null;
    const updated: Business = { ...this.store[index], ...patch, updatedAt: new Date().toISOString(), lastSelfEditAt: new Date().toISOString() };
    this.store[index] = updated;
    return updated;
  }

  async setStatus(businessId: string, ownerId: string, status: BusinessPublicationStatus): Promise<Business | null> {
    const index = this.store.findIndex((entry) => entry.id === businessId && entry.ownerId === ownerId);
    if (index === -1) return null;
    const updated: Business = {
      ...this.store[index],
      status,
      updatedAt: new Date().toISOString(),
      publishedAt: status === "published" ? new Date().toISOString() : this.store[index].publishedAt,
    };
    this.store[index] = updated;
    return updated;
  }
}

export const businessRepository = new MockBusinessRepository();

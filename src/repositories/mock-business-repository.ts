import { ALL_BUSINESSES } from "@/data/all-businesses";
import { getRelatedBusinesses } from "@/utils/get-related-businesses";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { mapRegistrationToBusiness } from "@/utils/map-registration-to-business";
import type { Business } from "@/types/business";
import type { BusinessPublicationStatus } from "@/types/business-status";
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
 * In-memory static demo data (see src/data/all-businesses.ts) merged with real, admin-approved
 * registrations from Supabase — the static list is unaffected either way, so the already-shipped
 * demo experience keeps working even if Supabase is briefly unreachable.
 */
export class MockBusinessRepository implements BusinessRepository {
  private readonly store: Business[] = ALL_BUSINESSES;

  async getPublishedBySlug(slug: string): Promise<Business | null> {
    const business = this.store.find((entry) => entry.slug === slug);
    if (business) return business.status === "published" ? business : null;

    const approved = await getApprovedSupabaseBusinesses();
    return approved.find((entry) => entry.slug === slug) ?? null;
  }

  /** Returns the business regardless of status — used by owner/admin preview, which must see drafts too. Supabase registrations aren't tied to a mock owner account, so only the static store is checked here (their pending/rejected state is only visible on the /admin page). */
  async getBySlugUnfiltered(slug: string): Promise<Business | null> {
    return this.store.find((entry) => entry.slug === slug) ?? null;
  }

  async getByOwnerId(ownerId: string): Promise<Business[]> {
    return this.store.filter((entry) => entry.ownerId === ownerId);
  }

  async getDraftById(businessId: string, ownerId: string): Promise<Business | null> {
    const business = this.store.find((entry) => entry.id === businessId);
    if (!business || business.ownerId !== ownerId) return null;
    return business;
  }

  async getRelated(business: Business, limit: number): Promise<Business[]> {
    const approved = await getApprovedSupabaseBusinesses();
    return getRelatedBusinesses(business, [...this.store, ...approved], limit);
  }

  async getAllPublished(): Promise<Business[]> {
    const approved = await getApprovedSupabaseBusinesses();
    return [...this.store.filter((entry) => entry.status === "published"), ...approved];
  }

  /**
   * Not part of the BusinessRepository interface (spec's suggested shape doesn't include a
   * write path) — added because the dashboard's profile-edit form needs somewhere real to save
   * to. Ownership is re-checked here too, not just by the caller.
   */
  async updateBusiness(businessId: string, ownerId: string, patch: Partial<EditableBusinessFields>): Promise<Business | null> {
    const index = this.store.findIndex((entry) => entry.id === businessId && entry.ownerId === ownerId);
    if (index === -1) return null;
    const updated: Business = { ...this.store[index], ...patch, updatedAt: new Date().toISOString() };
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

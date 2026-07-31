import { ALL_BUSINESSES } from "@/data/all-businesses";
import { getRelatedBusinesses } from "@/utils/get-related-businesses";
import type { Business } from "@/types/business";
import type { BusinessPublicationStatus } from "@/types/business-status";
import type { BusinessRepository } from "./business-repository";

type EditableBusinessFields = Pick<
  Business,
  "name" | "shortDescription" | "fullDescription" | "phone" | "whatsappUrl" | "websiteUrl" | "address" | "serviceArea"
>;

/** In-memory only — there is no database yet. See src/data/all-businesses.ts for the merged source (shared with the archive page, so status is consistent everywhere). */
export class MockBusinessRepository implements BusinessRepository {
  private readonly store: Business[] = ALL_BUSINESSES;

  async getPublishedBySlug(slug: string): Promise<Business | null> {
    const business = this.store.find((entry) => entry.slug === slug);
    if (!business || business.status !== "published") return null;
    return business;
  }

  /** Returns the business regardless of status — used by owner/admin preview, which must see drafts too. */
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
    return getRelatedBusinesses(business, this.store, limit);
  }

  async getAllPublished(): Promise<Business[]> {
    return this.store.filter((entry) => entry.status === "published");
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

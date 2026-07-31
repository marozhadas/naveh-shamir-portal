import type { Business } from "@/types/business";

/**
 * UI code and pages must go through this interface, never import src/data/*.ts directly for
 * anything business-profile-related (spec section 47) — swapping the mock implementation for a
 * real database-backed one later means changing only mock-business-repository.ts.
 */
export interface BusinessRepository {
  getPublishedBySlug(slug: string): Promise<Business | null>;
  getByOwnerId(ownerId: string): Promise<Business[]>;
  getDraftById(businessId: string, ownerId: string): Promise<Business | null>;
  getRelated(business: Business, limit: number): Promise<Business[]>;
  getAllPublished(): Promise<Business[]>;
}

import { authAdapter } from "@/adapters/mock-auth-adapter";
import { businessRepository } from "@/repositories/mock-business-repository";
import type { Business } from "@/types/business";
import type { AuthenticatedUser } from "@/types/auth";

export type BusinessProfileView =
  | { kind: "published"; business: Business; viewer: AuthenticatedUser | null }
  | { kind: "preview"; business: Business; viewer: AuthenticatedUser }
  | { kind: "unavailable" }
  | { kind: "not-found" };

/**
 * The single place that decides what a given slug resolves to for a given viewer (spec section
 * 4/42/45/46): published businesses are public; drafts/pending-review/suspended/archived
 * businesses are only visible, as a clearly-labeled preview, to their owner or an admin —
 * everyone else gets a generic "unavailable" message that never leaks the real reason, and a
 * slug that matches nothing at all is a plain 404.
 */
export async function resolveBusinessView(slug: string): Promise<BusinessProfileView> {
  const published = await businessRepository.getPublishedBySlug(slug);
  if (published) {
    const viewer = await authAdapter.getCurrentUser();
    return { kind: "published", business: published, viewer };
  }

  const business = await businessRepository.getBySlugUnfiltered(slug);
  if (!business) return { kind: "not-found" };

  const viewer = await authAdapter.getCurrentUser();
  const canPreview = viewer && (viewer.role === "admin" || business.ownerId === viewer.id);
  if (canPreview && viewer) return { kind: "preview", business, viewer };

  return { kind: "unavailable" };
}

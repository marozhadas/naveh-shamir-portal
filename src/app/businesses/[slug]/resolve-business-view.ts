import { permanentRedirect } from "next/navigation";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { findSlugRedirectTarget } from "@/repositories/business-slug-redirect-repository";
import { getBusinessListingAccess } from "@/domain/get-business-listing-access";
import type { Business } from "@/types/business";
import type { AuthenticatedUser } from "@/types/auth";
import type { BusinessListingAccess } from "@/types/business-listing-access";

export type BusinessProfileView =
  | { kind: "published"; business: Business; viewer: AuthenticatedUser | null; access: BusinessListingAccess }
  | { kind: "preview"; business: Business; viewer: AuthenticatedUser; access: BusinessListingAccess }
  | { kind: "unavailable" }
  | { kind: "not-found" };

function canPreviewAs(viewer: AuthenticatedUser | null, business: Business): viewer is AuthenticatedUser {
  return Boolean(viewer && (viewer.role === "admin" || business.ownerId === viewer.id));
}

/**
 * Next.js's dynamic route params are supposed to already be URL-decoded, but for a non-ASCII
 * (e.g. Hebrew) slug this build inconsistently hands the page component the still-percent-encoded
 * string while generateMetadata gets the decoded one for the exact same request — every real
 * Hebrew-slugged business would 404 for visitors despite existing and being premium. Decoding
 * here is safe either way: a slug that's already decoded (plain Hebrew, no "%" sequences) passes
 * through decodeURIComponent unchanged.
 */
export function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/**
 * The single place that decides what a given slug resolves to for a given viewer. Two
 * independent gates apply, in order:
 *
 * 1. Publication status (draft/pending-review/suspended/archived businesses are never public —
 *    spec section 4/42/45/46).
 * 2. Listing access (spec section 9): even a *published, approved* business only gets a public
 *    profile page while it's premium (active subscription or trial). A published-but-basic
 *    business still has a real page and full saved content — nothing is deleted — it's just not
 *    served to the public until premium access is restored, same as the draft case: the owner or
 *    an admin can still preview it, everyone else gets the same generic "unavailable" message
 *    (never the real reason — no payment status, no expiry date, spec section 9/25).
 */
export async function resolveBusinessView(rawSlug: string): Promise<BusinessProfileView> {
  const slug = normalizeSlug(rawSlug);
  const published = await businessRepository.getPublishedBySlug(slug);
  if (published) {
    const subscription = await subscriptionRepository.getByBusinessId(published.id);
    const access = getBusinessListingAccess(published, subscription, new Date());

    if (access.canOpenProfile) {
      const viewer = await authAdapter.getCurrentUser();
      return { kind: "published", business: published, viewer, access };
    }

    const viewer = await authAdapter.getCurrentUser();
    if (canPreviewAs(viewer, published)) {
      return { kind: "preview", business: published, viewer, access };
    }
    return { kind: "unavailable" };
  }

  const business = await businessRepository.getBySlugUnfiltered(slug);
  if (!business) {
    // Not a slug that exists today — check whether it used to be one (an admin changed it via
    // changeBusinessSlugAction) before giving up with a real 404. permanentRedirect() (308) throws
    // internally, so this short-circuits rendering exactly like notFound() does.
    const newSlug = await findSlugRedirectTarget(slug);
    if (newSlug) permanentRedirect(`/businesses/${newSlug}`);
    return { kind: "not-found" };
  }

  const viewer = await authAdapter.getCurrentUser();
  if (canPreviewAs(viewer, business)) {
    const subscription = await subscriptionRepository.getByBusinessId(business.id);
    const access = getBusinessListingAccess(business, subscription, new Date());
    return { kind: "preview", business, viewer, access };
  }

  return { kind: "unavailable" };
}

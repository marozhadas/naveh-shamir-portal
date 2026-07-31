import { BUSINESSES_DIRECTORY } from "@/data/businesses-directory";
import { BUSINESS_PROFILE_OVERRIDES } from "@/data/business-profiles";
import type { Business } from "@/types/business";

/**
 * The one merged view of the full directory (base record + profile overrides, defaulting to
 * `status: "published"`) — both the business archive (/businesses) and the mock business
 * repository (/businesses/[slug], dashboards) read from this SAME array, so a business's
 * publication status is consistent everywhere instead of the archive listing something that
 * 404s/unavailables when actually opened.
 */
export const ALL_BUSINESSES: Business[] = BUSINESSES_DIRECTORY.map((business) => ({
  status: "published",
  ...business,
  ...(BUSINESS_PROFILE_OVERRIDES[business.id] ?? {}),
}));

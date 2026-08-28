import type { MarketplaceListingStatus } from "@/types/marketplace";

/**
 * The only status transitions a poster may make through their own management link (see
 * src/repositories/marketplace-management-service.ts) — never "pending" or "removed" (those are
 * moderation-only, via the admin). Pure and DB-free on purpose so the rules themselves are
 * unit-testable without touching Supabase.
 */
export const SELF_SERVICE_TRANSITIONS: Record<MarketplaceListingStatus, MarketplaceListingStatus[]> = {
  pending: [],
  active: ["sold", "delivered"],
  reserved: ["sold", "delivered", "active"],
  delivered: ["active"],
  sold: ["active"],
  removed: [],
};

export function isValidSelfServiceTransition(current: MarketplaceListingStatus, next: MarketplaceListingStatus): boolean {
  return SELF_SERVICE_TRANSITIONS[current]?.includes(next) ?? false;
}

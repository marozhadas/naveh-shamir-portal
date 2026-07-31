import type { BusinessLocation } from "@/types/business";

/**
 * A plain Google Maps search URL (no SDK/API key involved, per spec section 28). Prefers exact
 * coordinates when available; falls back to the address text. Returns null when there's nothing
 * safe to link to.
 */
export function createMapLink(location: BusinessLocation | undefined): string | null {
  if (!location) return null;

  if (typeof location.latitude === "number" && typeof location.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }

  if (location.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
  }

  return null;
}

"use server";

import { reportListing } from "@/repositories/marketplace-service";

export async function reportMarketplaceListingAction(listingId: string): Promise<boolean> {
  return reportListing(listingId);
}

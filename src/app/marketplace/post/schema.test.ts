import { describe, expect, it } from "vitest";
import { EMPTY_LISTING_FORM_VALUES, marketplaceListingSchema, type MarketplaceListingFormValues } from "./schema";

function valid(overrides: Partial<MarketplaceListingFormValues> = {}): MarketplaceListingFormValues {
  return {
    ...EMPTY_LISTING_FORM_VALUES,
    title: "ספה",
    description: "ספה במצב טוב",
    listingType: "sale",
    categoryId: "furniture",
    price: "100",
    contactName: "נועה",
    phone: "0501234567",
    privacyConsent: true,
    ...overrides,
  };
}

describe("marketplaceListingSchema — privacy consent", () => {
  it("is unchecked by default", () => {
    expect(EMPTY_LISTING_FORM_VALUES.privacyConsent).toBe(false);
  });

  it("refuses to publish without the privacy consent", () => {
    const result = marketplaceListingSchema.safeParse(valid({ privacyConsent: false }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.privacyConsent?.[0]).toBe("כדי להמשיך יש לאשר את מדיניות הפרטיות.");
  });
});

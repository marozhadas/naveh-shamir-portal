import { Eye } from "lucide-react";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BusinessBreadcrumbs } from "@/components/business-profile/BusinessBreadcrumbs/BusinessBreadcrumbs";
import { BusinessHero } from "@/components/business-profile/BusinessHero/BusinessHero";
import { BusinessGallery } from "@/components/business-profile/BusinessGallery/BusinessGallery";
import { BusinessAbout } from "@/components/business-profile/BusinessAbout/BusinessAbout";
import { BusinessServices } from "@/components/business-profile/BusinessServices/BusinessServices";
import { BusinessOpeningHoursList } from "@/components/business-profile/BusinessOpeningHoursList/BusinessOpeningHoursList";
import { BusinessLocationCard } from "@/components/business-profile/BusinessLocationCard/BusinessLocationCard";
import { BusinessPromotionBanner } from "@/components/business-profile/BusinessPromotionBanner/BusinessPromotionBanner";
import { BusinessSocialLinksRow } from "@/components/business-profile/BusinessSocialLinksRow/BusinessSocialLinksRow";
import { RelatedBusinesses } from "@/components/business-profile/RelatedBusinesses/RelatedBusinesses";
import { BusinessOwnerCTA } from "@/components/business-profile/BusinessOwnerCTA/BusinessOwnerCTA";
import { MobileBusinessActions } from "@/components/business-profile/MobileBusinessActions/MobileBusinessActions";
import { getBusinessDescription } from "@/utils/business-profile";
import type { Business } from "@/types/business";
import type { AuthenticatedUser } from "@/types/auth";
import type { BusinessListingAccess } from "@/types/business-listing-access";
import styles from "./BusinessProfilePage.module.css";

type BusinessProfilePageProps = {
  business: Business;
  access: BusinessListingAccess;
  relatedBusinesses: Business[];
  relatedAccessByBusinessId: Record<string, BusinessListingAccess>;
  viewer: AuthenticatedUser | null;
  isPreview: boolean;
};

/**
 * Pure presentational composition root — receives fully-resolved data via props (spec section
 * 41: "site components work outside the editor too"), never reaches into a repository or auth
 * adapter itself. The page component (app/businesses/[slug]/page.tsx) does that resolution.
 *
 * `isPreview` already means only the owner/admin ever reaches this component for a basic-tier
 * business (see resolve-business-view.ts) — the full saved content (gallery/services/hours) is
 * still shown to them in preview, since nothing is deleted when premium access lapses. Only the
 * verified badge is gated by `access.canShowVerifiedBadge`, never by `business.verified`.
 */
export function BusinessProfilePage({ business, access, relatedBusinesses, relatedAccessByBusinessId, viewer, isPreview }: BusinessProfilePageProps) {
  const description = getBusinessDescription(business);

  return (
    <>
      <ConnectedHeader />
      {isPreview && (
        <div className={styles.previewBanner} role="status">
          <Eye size={16} aria-hidden="true" />
          תצוגה מקדימה — העמוד עדיין אינו גלוי לציבור
          {viewer && <span className={styles.previewViewer}>מוצג עבור: {viewer.name}</span>}
          <Link href="/business/dashboard" className={styles.previewBackLink}>
            חזרה לדשבורד
          </Link>
        </div>
      )}
      <main id="main-content" className={styles.main}>
        <div className={styles.container}>
          <BusinessBreadcrumbs businessName={business.name} />
          <BusinessHero business={business} access={access} />
          {business.promotion && <BusinessPromotionBanner promotion={business.promotion} />}
          {business.gallery && business.gallery.length > 0 && <BusinessGallery images={business.gallery} />}
          <BusinessAbout description={description} highlights={business.highlights} />
          {business.services && business.services.length > 0 && <BusinessServices services={business.services} />}
          <div className={styles.twoColumn}>
            {business.openingHours && business.openingHours.length > 0 && (
              <BusinessOpeningHoursList openingHours={business.openingHours} />
            )}
            {business.location && <BusinessLocationCard location={business.location} />}
          </div>
          <BusinessSocialLinksRow socialLinks={business.socialLinks} />
          <RelatedBusinesses businesses={relatedBusinesses} accessByBusinessId={relatedAccessByBusinessId} />
          <BusinessOwnerCTA />
        </div>
      </main>
      <MobileBusinessActions business={business} />
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

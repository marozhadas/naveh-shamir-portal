import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { ConnectedFooter } from "@/editor/connected/ConnectedFooter";
import { ConnectedHero } from "@/editor/connected/ConnectedHero";
import { ConnectedMovableSections } from "@/editor/connected/ConnectedMovableSections";
import { EditableRegion } from "@/editor/components/EditableRegion/EditableRegion";
import { MarketplaceSection } from "@/components/home/MarketplaceSection/MarketplaceSection";
import { EssentialNumbersHomeSection } from "@/components/home/EssentialNumbersHomeSection/EssentialNumbersHomeSection";
import { ContactCtaSection } from "@/components/home/ContactCtaSection/ContactCtaSection";
import { listHeroGalleryImages } from "@/repositories/hero-gallery-service";
import { getPublishedEvents } from "@/repositories/community-events-service";
import { pickHomepageTeaserEvents } from "@/utils/map-community-events-to-teaser-cards";
import { getFeaturedApprovedBusinesses } from "@/repositories/featured-businesses-service";
import { getActiveListings } from "@/repositories/marketplace-service";
import { getPublishedEssentialNumbers } from "@/repositories/essential-numbers-service";
import { sortEssentialNumbers } from "@/utils/essential-number-filters";
import { getListingAccessByBusinessId } from "@/domain/get-business-listing-access";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { mapRegistrationToBusiness } from "@/utils/map-registration-to-business";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [galleryImages, allPublishedEvents, featuredRegistrations, marketplaceListings, publishedEssentialNumbers] = await Promise.all([
    listHeroGalleryImages(),
    getPublishedEvents(),
    getFeaturedApprovedBusinesses(),
    getActiveListings(),
    getPublishedEssentialNumbers(),
  ]);

  const upcomingEvents = pickHomepageTeaserEvents(allPublishedEvents);

  // Each admin-featured business needs its own public-profile access (Plus/Premium tiers only) so
  // the card can decide whether its name links to a real profile page or just displays as text —
  // same logic already used for "related businesses" on the business profile page.
  const featuredAsBusinesses = featuredRegistrations.map(mapRegistrationToBusiness);
  const accessByBusinessId = await getListingAccessByBusinessId(featuredAsBusinesses, subscriptionRepository, new Date());
  const featuredBusinesses = featuredRegistrations.map((registration) => ({
    registration,
    canOpenProfile: accessByBusinessId[registration.id]?.canOpenProfile ?? false,
  }));

  const marketplaceTeaser = marketplaceListings.slice(0, 4);
  const essentialNumbersTeaser = sortEssentialNumbers(publishedEssentialNumbers).slice(0, 4);

  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <EditableRegion id="home.header" label="כותרת עליונה">
        <ConnectedHeader />
      </EditableRegion>
      <main id="main-content">
        <EditableRegion id="home.hero" label="אזור ראשי">
          <ConnectedHero galleryImages={galleryImages} />
        </EditableRegion>
        <ConnectedMovableSections upcomingEvents={upcomingEvents} featuredBusinesses={featuredBusinesses} />
        <MarketplaceSection listings={marketplaceTeaser} />
        <EssentialNumbersHomeSection entries={essentialNumbersTeaser} />
        <ContactCtaSection />
      </main>
      <EditableRegion id="home.footer" label="פוטר">
        <ConnectedFooter />
      </EditableRegion>
    </>
  );
}

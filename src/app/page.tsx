import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { ConnectedFooter } from "@/editor/connected/ConnectedFooter";
import { ConnectedHero } from "@/editor/connected/ConnectedHero";
import { ConnectedMovableSections } from "@/editor/connected/ConnectedMovableSections";
import { EditableRegion } from "@/editor/components/EditableRegion/EditableRegion";
import { listHeroGalleryImages } from "@/repositories/hero-gallery-service";
import { getPublishedEvents } from "@/repositories/community-events-service";
import { pickHomepageTeaserEvents } from "@/utils/map-community-events-to-teaser-cards";

export default async function Home() {
  const [galleryImages, allPublishedEvents] = await Promise.all([listHeroGalleryImages(), getPublishedEvents()]);
  const upcomingEvents = pickHomepageTeaserEvents(allPublishedEvents);

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
        <ConnectedMovableSections upcomingEvents={upcomingEvents} />
      </main>
      <EditableRegion id="home.footer" label="פוטר">
        <ConnectedFooter />
      </EditableRegion>
    </>
  );
}

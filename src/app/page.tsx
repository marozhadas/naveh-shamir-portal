import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { ConnectedFooter } from "@/editor/connected/ConnectedFooter";
import { ConnectedHero } from "@/editor/connected/ConnectedHero";
import { ConnectedMovableSections } from "@/editor/connected/ConnectedMovableSections";
import { EditableRegion } from "@/editor/components/EditableRegion/EditableRegion";
import { listHeroGalleryImages } from "@/repositories/hero-gallery-service";

export default async function Home() {
  const galleryImages = await listHeroGalleryImages();

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
        <ConnectedMovableSections />
      </main>
      <EditableRegion id="home.footer" label="פוטר">
        <ConnectedFooter />
      </EditableRegion>
    </>
  );
}

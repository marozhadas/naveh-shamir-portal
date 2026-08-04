import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { MarketplaceArchive } from "@/components/marketplace/MarketplaceArchive/MarketplaceArchive";
import { MarketplaceGridSkeleton } from "@/components/marketplace/MarketplaceGridSkeleton/MarketplaceGridSkeleton";
import { getActiveListings } from "@/repositories/marketplace-service";
import styles from "./marketplace.module.css";

const PAGE_TITLE = "לוח מסירה ומכירה בנווה שמיר | הפורטל של השכונה";
const PAGE_DESCRIPTION = "מוצרים, ריהוט, ציוד ופריטים מתושבי נווה שמיר — למסירה או למכירה.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/marketplace" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

// Reads live, admin-approved listings from Supabase on every request.
export const dynamic = "force-dynamic";

async function MarketplaceArchiveLoader() {
  const listings = await getActiveListings();
  return <MarketplaceArchive listings={listings} />;
}

export default function MarketplacePage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.pageHeadWrap}>
          <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "מסירה ומכירה" }]} title="לוח מסירה ומכירה" description={PAGE_DESCRIPTION} />
          <div className={styles.ctaWrap}>
            <Button href="/marketplace/post" variant="accent">
              פרסום מודעה
            </Button>
          </div>
        </div>

        <div className={styles.container}>
          <Suspense fallback={<MarketplaceGridSkeleton />}>
            <MarketplaceArchiveLoader />
          </Suspense>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

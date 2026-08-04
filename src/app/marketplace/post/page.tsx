import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { MarketplaceListingForm } from "./MarketplaceListingForm";
import styles from "./post.module.css";

export const metadata: Metadata = { title: "פרסום מודעה | לוח מסירה ומכירה | נווה שמיר", robots: { index: false, follow: false } };

export default function PostMarketplaceListingPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <PageHeader
          breadcrumbs={[{ label: "בית", href: "/" }, { label: "מסירה ומכירה", href: "/marketplace" }, { label: "פרסום מודעה" }]}
          title="פרסום מודעה"
          description="מלאו את פרטי הפריט — המודעה תפורסם בלוח לאחר בדיקה קצרה של צוות הפורטל."
        />
        <div className={styles.container}>
          <MarketplaceListingForm />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import styles from "./real-estate.module.css";

const PAGE_TITLE = "נדל״ן בשכונה | הפורטל של נווה שמיר";
const PAGE_DESCRIPTION = "מדור הנדל״ן של נווה שמיר - בקרוב.";

// A placeholder until the section is built: kept out of search results (and out of the sitemap) for now.
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/real-estate" },
  robots: { index: false, follow: true },
};

export default function RealEstatePage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "נדל״ן בשכונה" }]} title="נדל״ן בשכונה" />
        <div className={styles.container}>
          <div className={styles.panel}>
            <Building2 size={32} aria-hidden="true" className={styles.icon} />
            <p className={styles.text}>בקרוב</p>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

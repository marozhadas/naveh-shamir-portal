import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { PageComingSoon } from "@/components/shared/PageComingSoon/PageComingSoon";
import styles from "./marketplace.module.css";

const PAGE_TITLE = "לוח מסירה ומכירה בנווה שמיר | הפורטל של השכונה";
const PAGE_DESCRIPTION = "מוצרים, ריהוט, ציוד ופריטים מתושבי נווה שמיר — למסירה או למכירה.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/marketplace" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

export default function MarketplacePage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "מסירה ומכירה" }]} title="לוח מסירה ומכירה" description={PAGE_DESCRIPTION} />
        <div className={styles.container}>
          <PageComingSoon
            title="הלוח בבנייה"
            description="בקרוב תוכלו לפרסם ולמצוא כאן מודעות מסירה ומכירה, עם סינון לפי סוג, קטגוריה וטווח מחירים."
          />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

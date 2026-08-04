import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import styles from "./community-board.module.css";

const PAGE_TITLE = "לוח הקהילה של נווה שמיר | הפורטל של השכונה";
const PAGE_DESCRIPTION = "בקרוב תוכלו למצוא כאן הודעות קהילתיות, גמ״חים, בקשות עזרה, חוגים, התנדבויות ועדכונים מתושבי השכונה.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/community-board" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

export default function CommunityBoardPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "לוח קהילה" }]} title="לוח הקהילה" description={PAGE_DESCRIPTION} />
        <div className={styles.container}>
          <div className={styles.panel}>
            <ClipboardList size={32} aria-hidden="true" className={styles.icon} />
            <p className={styles.text}>הלוח עדיין בבנייה — נשמח לשמוע רעיונות למה שהוא צריך לכלול.</p>
            <Button href="/contact" variant="secondary">
              יש לכם רעיון ללוח? כתבו לי
            </Button>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

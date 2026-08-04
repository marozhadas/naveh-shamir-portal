import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { PageComingSoon } from "@/components/shared/PageComingSoon/PageComingSoon";
import styles from "./events.module.css";

const PAGE_TITLE = "אירועים בנווה שמיר | הפורטל של השכונה";
const PAGE_DESCRIPTION = "פעילויות, מפגשים, הרצאות, חוגים ואירועים קהילתיים בנווה שמיר.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/events" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

export default function EventsPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "אירועים" }]} title="אירועים בשכונה" description={PAGE_DESCRIPTION} />
        <div className={styles.container}>
          <PageComingSoon
            title="העמוד בבנייה"
            description="בקרוב תוכלו לראות כאן את כל האירועים בשכונה, מסודרים לפי תאריך וניתנים לסינון לפי סוג ותאריך."
          />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

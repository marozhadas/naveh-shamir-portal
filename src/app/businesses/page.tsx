import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultHeaderSettings, defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BusinessesArchive } from "@/components/business-archive/BusinessesArchive/BusinessesArchive";
import { BusinessesGridSkeleton } from "@/components/business-archive/BusinessesGridSkeleton/BusinessesGridSkeleton";
import styles from "./businesses.module.css";

const PAGE_TITLE = "עסקים בנווה שמיר | הפורטל של השכונה";
const PAGE_DESCRIPTION =
  "אינדקס העסקים של נווה שמיר: אוכל, ביוטי, בריאות, בייביסיטר, שירותים מקצועיים, בעלי מקצוע ועוד.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/businesses" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    locale: "he_IL",
    type: "website",
  },
};

export default function BusinessesPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.pageHead}>
          <nav aria-label="פירורי לחם" className={styles.breadcrumbs}>
            <ol className={styles.breadcrumbList}>
              <li>
                <Link href="/">בית</Link>
              </li>
              <li aria-hidden="true" className={styles.separator}>
                /
              </li>
              <li aria-current="page">עסקים</li>
            </ol>
          </nav>
          <h1 className={styles.title}>העסקים של נווה שמיר</h1>
          <p className={styles.description}>כל בעלי המקצוע, השירותים והעסקים המקומיים של השכונה — במקום אחד.</p>
        </div>

        <div className={styles.container}>
          <Suspense fallback={<BusinessesGridSkeleton />}>
            <BusinessesArchive />
          </Suspense>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

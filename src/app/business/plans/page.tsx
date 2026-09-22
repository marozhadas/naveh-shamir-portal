import type { Metadata } from "next";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BUSINESS_PLANS } from "@/data/business-plans";
import { PlansGrid } from "./PlansGrid";
import styles from "./plans.module.css";

export const metadata: Metadata = { title: "חבילות לעסקים | נווה שמיר", robots: { index: false, follow: false } };

export default function BusinessPlansPage() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <nav aria-label="פירורי לחם" className={styles.breadcrumbs}>
            <ol className={styles.breadcrumbList}>
              <li>
                <Link href="/">בית</Link>
              </li>
              <li aria-hidden="true" className={styles.separator}>
                /
              </li>
              <li aria-current="page">חבילות לעסקים</li>
            </ol>
          </nav>
          <h1 className={styles.title}>בחרו את החבילה המתאימה לעסק שלכם</h1>
          <p className={styles.description}>
            אפשר להתחיל ברישום חינמי, ולשדרג בכל שלב לעמוד עסק מלא עם יותר חשיפה. מחירי Plus ו־Premium הם מחירי השקה.
          </p>

          <PlansGrid plans={BUSINESS_PLANS} />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

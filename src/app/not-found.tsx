import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "הדף לא נמצא | נווה שמיר", robots: { index: false, follow: false } };

/**
 * Site-wide 404 (any URL no route matches, and any notFound() in a segment without its own not-found file).
 * /businesses/[slug] keeps its own, more specific one.
 */
export default function NotFound() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <div className={styles.wrap}>
            <SearchX size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
            <p className={styles.code}>שגיאה 404</p>
            <h1 className={styles.title}>הדף לא נמצא</h1>
            <p className={styles.description}>ייתכן שהקישור שגוי או שהדף הוסר. אפשר לחזור לדף הבית ולהמשיך משם.</p>
            <div className={styles.actions}>
              <Button href="/" variant="accent">
                חזרה לדף הבית
              </Button>
              <Button href="/businesses" variant="secondary">
                לכל העסקים
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BUSINESS_PLANS } from "@/data/business-plans";
import { PlusRegistrationWizard } from "./PlusRegistrationWizard";
import styles from "./plus-wizard.module.css";

export const metadata: Metadata = { title: "הרשמה לחבילת Plus | נווה שמיר", robots: { index: false, follow: false } };

const plan = BUSINESS_PLANS.find((item) => item.tier === "plus")!;

export default function RegisterPlusPage() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.page}>
          <nav aria-label="פירורי לחם" className={styles.breadcrumbs}>
            <ol className={styles.breadcrumbList}>
              <li>
                <Link href="/businesses">עסקים</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/business/plans">חבילות</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">הרשמה לחבילת Plus</li>
            </ol>
          </nav>

          <div className={styles.hero}>
            <span className={styles.badge}>חודש ראשון חינם</span>
            <h1 className={styles.title}>בואו נבנה לעסק שלכם עמוד מלא</h1>
            <p className={styles.description}>
              מלאו את פרטי העסק, הוסיפו תמונות ושירותים, ואנחנו נכין את העמוד שלכם לאישור ולפרסום.
            </p>
            <p className={styles.priceLine}>לאחר החודש הראשון: {plan.priceLabel} לחודש</p>
            <p className={styles.disclaimer}>בשלב זה לא נדרש אמצעי תשלום בזמן מילוי הטופס.</p>
          </div>

          <div className={styles.layout}>
            <PlusRegistrationWizard planId="plus" priceLabel={plan.priceLabel} />

            <aside className={styles.summaryCard} aria-label="סיכום חבילת Plus">
              <p className={styles.summaryPlanName}>Plus</p>
              <p className={styles.summaryPrice}>{plan.priceLabel} לחודש</p>
              <p className={styles.summaryBillingNote}>חודש ראשון חינם</p>
              <ul className={styles.summaryFeatureList}>
                <li>עמוד עסק מלא</li>
                <li>גלריית תמונות</li>
                <li>רשימת שירותים</li>
                <li>שעות פעילות</li>
                <li>כרטיס עסק לחיץ</li>
                <li>כפתורי טלפון ו-WhatsApp</li>
                <li>קישורים לאתר ולרשתות חברתיות</li>
                <li>אפשרות להציג מבצע</li>
              </ul>
              <Link href="/business/plans" className={styles.summaryBackLink}>
                חזרה להשוואת החבילות
              </Link>
            </aside>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

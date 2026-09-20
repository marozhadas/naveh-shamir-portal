import type { Metadata } from "next";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BUSINESS_PLANS } from "@/data/business-plans";
import { PlanPriceBlock } from "@/components/pricing/PlanPriceBlock";
import { PlusRegistrationWizard } from "../plus/PlusRegistrationWizard";
import styles from "../plus/plus-wizard.module.css";

export const metadata: Metadata = { title: "הרשמה לחבילת Premium | נווה שמיר", robots: { index: false, follow: false } };

const plan = BUSINESS_PLANS.find((item) => item.tier === "premium")!;
const pricing = plan.pricing!;

export default function RegisterPremiumPage() {
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
              <li aria-current="page">הרשמה לחבילת Premium</li>
            </ol>
          </nav>

          <div className={styles.hero}>
            <span className={styles.badge}>החבילה המתקדמת</span>
            <h1 className={styles.title}>בואו נבנה לעסק שלכם נוכחות מלאה ומאומתת</h1>
            <p className={styles.description}>
              מלאו את פרטי העסק, הוסיפו תמונות, שירותים ושעות פעילות, וקבלו עמוד עסק מלא עם תגית עסק מאומת ואזור אישי
              לניהול עצמאי.
            </p>
            <p className={styles.priceLine}>30 ימי ניסיון חינם, במסלול החודשי ובמסלול השנתי. מחירי Premium הם מחירי השקה.</p>
            <p className={styles.disclaimer}>
              בשלב זה לא נדרש אמצעי תשלום ולא מתבצע חיוב. הניסיון מתחיל רק לאחר אישור העסק והפעלה מפורשת.
            </p>
          </div>

          <div className={styles.layout}>
            <PlusRegistrationWizard planId="premium" />

            <aside className={styles.summaryCard} aria-label="סיכום חבילת Premium">
              <p className={styles.summaryPlanName}>Premium</p>
              <PlanPriceBlock monthly={pricing.monthly} yearly={pricing.yearly} />
              <p className={styles.summaryBillingNote}>30 ימי ניסיון חינם בשני המסלולים</p>
              <ul className={styles.summaryFeatureList}>
                <li>כל מה שכלול ב-Plus</li>
                <li>תגית &quot;עסק מאומת&quot;</li>
                <li>אזור אישי לעריכה עצמאית</li>
                <li>עריכה עצמאית ללא הגבלה</li>
                <li>זכאות להופיע באזור העסקים הנבחרים בעמוד הבית (ההצגה נקבעת על ידי מנהל הפורטל)</li>
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

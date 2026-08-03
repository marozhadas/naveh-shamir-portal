import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { BUSINESS_PLANS } from "@/data/business-plans";
import { PlusRegistrationWizard } from "../plus/PlusRegistrationWizard";
import styles from "../plus/plus-wizard.module.css";

export const metadata: Metadata = { title: "הרשמה לחבילת Premium | נווה שמיר", robots: { index: false, follow: false } };

const plan = BUSINESS_PLANS.find((item) => item.tier === "premium")!;

export default function RegisterPremiumPage() {
  return (
    <>
      <Header settings={defaultHeaderSettings} />
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
            <p className={styles.priceLine}>{plan.priceLabel} לחודש</p>
            <p className={styles.disclaimer}>
              לאחר אישור העסק והפעלת החבילה, יישלח אליכם למייל קישור אישי ומאובטח לניהול העמוד.
            </p>
          </div>

          <div className={styles.layout}>
            <PlusRegistrationWizard planId="premium" priceLabel={plan.priceLabel} />

            <aside className={styles.summaryCard} aria-label="סיכום חבילת Premium">
              <p className={styles.summaryPlanName}>Premium</p>
              <p className={styles.summaryPrice}>{plan.priceLabel} לחודש</p>
              <ul className={styles.summaryFeatureList}>
                <li>כל מה שכלול ב-Plus</li>
                <li>עמוד עסק מלא</li>
                <li>גלריית תמונות</li>
                <li>שירותים ושעות פעילות</li>
                <li>כרטיס עסק לחיץ</li>
                <li>תגית &quot;עסק מאומת&quot;</li>
                <li>אזור אישי לעריכה עצמאית</li>
                <li>עדכון תמונות, שירותים ושעות ללא פנייה לאדמין</li>
                <li>זכאות להופיע באזור עסקים מובילים</li>
                <li>עדיפות בתוצאות החיפוש בהתאם ללוגיקה הקיימת</li>
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

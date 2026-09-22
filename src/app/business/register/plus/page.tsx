import type { Metadata } from "next";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BUSINESS_PLANS } from "@/data/business-plans";
import { PlanPriceBlock } from "@/components/pricing/PlanPriceBlock";
import { isBillingInterval } from "@/data/subscription-pricing";
import { PlusRegistrationWizard } from "./PlusRegistrationWizard";
import styles from "./plus-wizard.module.css";

export const metadata: Metadata = { title: "הרשמה לחבילת Plus | נווה שמיר", robots: { index: false, follow: false } };

const plan = BUSINESS_PLANS.find((item) => item.tier === "plus")!;
const pricing = plan.pricing!;

type RegisterPlusPageProps = {
  searchParams: Promise<{ interval?: string }>;
};

export default async function RegisterPlusPage({ searchParams }: RegisterPlusPageProps) {
  const { interval } = await searchParams;
  const initialBillingInterval = isBillingInterval(interval) ? interval : "monthly";
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
            <span className={styles.badge}>30 ימי ניסיון חינם</span>
            <h1 className={styles.title}>בואו נבנה לעסק שלכם עמוד מלא</h1>
            <p className={styles.description}>
              מלאו את פרטי העסק, הוסיפו תמונות ושירותים, ואנחנו נכין את העמוד שלכם לאישור ולפרסום.
            </p>
            <p className={styles.priceLine}>30 ימי ניסיון חינם, במסלול החודשי ובמסלול השנתי. מחירי Plus הם מחירי השקה.</p>
            <p className={styles.disclaimer}>בשלב זה לא נדרש אמצעי תשלום ולא מתבצע חיוב. הניסיון מתחיל רק לאחר אישור העסק והפעלה מפורשת.</p>
          </div>

          <div className={styles.layout}>
            <PlusRegistrationWizard planId="plus" initialBillingInterval={initialBillingInterval} />

            <aside className={styles.summaryCard} aria-label="סיכום חבילת Plus">
              <p className={styles.summaryPlanName}>Plus</p>
              <PlanPriceBlock monthly={pricing.monthly} yearly={pricing.yearly} />
              <p className={styles.summaryBillingNote}>30 ימי ניסיון חינם בשני המסלולים</p>
              <ul className={styles.summaryFeatureList}>
                <li>עמוד עסק מלא</li>
                <li>גלריית תמונות</li>
                <li>רשימת שירותים</li>
                <li>שעות פעילות</li>
                <li>כרטיס עסק לחיץ</li>
                <li>דרכי יצירת קשר</li>
                <li>עריכה פעם אחת בכל חודש קלנדרי (שעון ישראל)</li>
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

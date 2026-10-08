import type { Metadata } from "next";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BUSINESS_PLANS } from "@/data/business-plans";
import { isBillingInterval } from "@/data/subscription-pricing";
import { getSupabaseSessionUser } from "@/lib/supabase/server-client";
import { registrationReturnPath } from "@/utils/safe-return-path";
import { OwnerAuthGate } from "@/components/auth/OwnerAuthGate/OwnerAuthGate";
import { RegistrationFlow } from "./RegistrationFlow";
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
  // Guard: Plus registration requires a real signed-in account (Basic stays open). The wizard is
  // only mounted once there is a session, so nothing a visitor typed can be lost to a login redirect;
  // the plan and billing interval live in this URL and ride through login as the return path.
  const sessionUser = await getSupabaseSessionUser();

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
            <p className={styles.priceLine}>30 ימי ניסיון חינם. מחירי Plus הם מחירי השקה.</p>
            <p className={styles.disclaimer}>בשלב זה לא נדרש אמצעי תשלום ולא מתבצע חיוב. הניסיון מתחיל רק לאחר אישור העסק והפעלה מפורשת.</p>
          </div>

          <RegistrationFlow
            planId="plus"
            planName="Plus"
            pricing={pricing}
            initialBillingInterval={initialBillingInterval}
            billingIntervalFromUrl={isBillingInterval(interval)}
            authenticated={Boolean(sessionUser)}
            gate={
              <OwnerAuthGate
                planName="Plus"
                billingIntervalLabel={initialBillingInterval === "yearly" ? "מסלול שנתי" : "מסלול חודשי"}
                returnTo={registrationReturnPath("plus", initialBillingInterval)}
              />
            }
            features={[
              "עמוד עסק מלא",
              "גלריית תמונות",
              "רשימת שירותים",
              "שעות פעילות",
              "כרטיס עסק לחיץ",
              "דרכי יצירת קשר",
              "עריכה פעם אחת בכל חודש קלנדרי (שעון ישראל)",
            ]}
          />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

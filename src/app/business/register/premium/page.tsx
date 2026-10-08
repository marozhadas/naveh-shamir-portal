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
import { RegistrationFlow } from "../plus/RegistrationFlow";
import styles from "../plus/plus-wizard.module.css";

export const metadata: Metadata = { title: "הרשמה לחבילת Premium | נווה שמיר", robots: { index: false, follow: false } };

const plan = BUSINESS_PLANS.find((item) => item.tier === "premium")!;
const pricing = plan.pricing!;

type RegisterPremiumPageProps = {
  searchParams: Promise<{ interval?: string }>;
};

export default async function RegisterPremiumPage({ searchParams }: RegisterPremiumPageProps) {
  const { interval } = await searchParams;
  const initialBillingInterval = isBillingInterval(interval) ? interval : "monthly";
  // Guard: Premium registration requires a real signed-in account (Basic stays open). The wizard is
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
            <p className={styles.priceLine}>30 ימי ניסיון חינם. מחירי Premium הם מחירי השקה.</p>
            <p className={styles.disclaimer}>
              בשלב זה לא נדרש אמצעי תשלום ולא מתבצע חיוב. הניסיון מתחיל רק לאחר אישור העסק והפעלה מפורשת.
            </p>
          </div>

          <RegistrationFlow
            planId="premium"
            planName="Premium"
            pricing={pricing}
            initialBillingInterval={initialBillingInterval}
            billingIntervalFromUrl={isBillingInterval(interval)}
            authenticated={Boolean(sessionUser)}
            gate={
              <OwnerAuthGate
                planName="Premium"
                billingIntervalLabel={initialBillingInterval === "yearly" ? "מסלול שנתי" : "מסלול חודשי"}
                returnTo={registrationReturnPath("premium", initialBillingInterval)}
              />
            }
            features={[
              "כל מה שכלול ב-Plus",
              'תגית "עסק מאומת"',
              "אזור אישי לעריכה עצמאית",
              "עריכה עצמאית ללא הגבלה",
              "זכאות להופיע באזור העסקים הנבחרים בעמוד הבית (ההצגה נקבעת על ידי מנהל הפורטל)",
            ]}
          />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

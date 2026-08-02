import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CircleCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { ViewerSwitcher } from "@/components/demo/ViewerSwitcher/ViewerSwitcher";
import { TrialStartForm } from "./TrialStartForm";
import { authAdapter, isRealBusinessOwnerSession } from "@/adapters/mock-auth-adapter";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { BUSINESS_MONTHLY_PLAN } from "@/types/subscription-plan";
import type { TrialEligibility } from "@/types/trial";
import styles from "./trial.module.css";

export const metadata: Metadata = {
  title: "הפעלת 30 ימי ניסיון | עסקים בנווה שמיר",
  description: "פתחו עמוד עסק מלא בפורטל נווה שמיר עם 30 ימי ניסיון חינם, ולאחר מכן מנוי חודשי.",
  robots: { index: false, follow: false },
};

const ELIGIBILITY_MESSAGE: Record<string, string> = {
  "not-authenticated": "כדי להפעיל ניסיון יש להתחבר קודם כבעל/ת העסק.",
  "business-not-found": "לא נמצא עסק המשויך לחשבון זה.",
  "business-not-owned": "החשבון המחובר אינו משויך לעסק.",
  "business-not-approved": "העסק שלכם עדיין ממתין לאישור הצוות שלנו. לאחר האישור תוכלו להפעיל את הניסיון מכאן.",
  "active-subscription": "לעסק שלכם כבר יש מנוי פעיל — ניתן לנהל אותו מהדשבורד.",
  "trial-already-used": "תקופת הניסיון החינמית כבר נוצלה עבור העסק שלכם. ניתן להפעיל מנוי מהדשבורד כדי לחזור לפרסום.",
  "subscription-not-eligible": "אירעה תקלה בבדיקת הזכאות לניסיון. נסו לרענן את העמוד בעוד כמה רגעים.",
};

export default async function BusinessTrialPage() {
  const [viewer, isRealSession] = await Promise.all([authAdapter.getCurrentUser(), isRealBusinessOwnerSession()]);
  const businessId = viewer?.ownedBusinessIds[0];

  let eligibility: TrialEligibility;
  if (!viewer) {
    eligibility = { eligible: false, reason: "not-authenticated" };
  } else if (!businessId) {
    eligibility = { eligible: false, reason: "business-not-owned" };
  } else {
    eligibility = await subscriptionRepository.checkTrialEligibility(businessId, viewer);
  }

  const priceLine =
    BUSINESS_MONTHLY_PLAN.priceAmount === null
      ? "המחיר יעודכן לפני ההשקה."
      : `${BUSINESS_MONTHLY_PLAN.priceAmount} ${BUSINESS_MONTHLY_PLAN.currency} לחודש לאחר תום הניסיון.`;

  return (
    <>
      <Header settings={defaultHeaderSettings} />
      {!isRealSession && <ViewerSwitcher currentViewerId={viewer?.id ?? null} />}
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>מפעילים את עמוד העסק המלא</h1>
          <p className={styles.subtitle}>
            30 ימי ניסיון להתנסות מלאה בעמוד עסק בפורטל נווה שמיר — כל היכולות פתוחות, ללא כרטיס אשראי מראש.
          </p>

          <p className={styles.featuresHeading}>מה כלול</p>
          <ul className={styles.features}>
            {BUSINESS_MONTHLY_PLAN.features.map((feature) => (
              <li key={feature}>
                <CircleCheck size={16} aria-hidden="true" className={styles.featureIcon} />
                {feature}
              </li>
            ))}
          </ul>

          <div className={styles.billingBox}>
            <div className={styles.billingRow}>
              <CalendarClock size={18} aria-hidden="true" />
              <span>משך הניסיון: 30 ימים בדיוק, החל מרגע ההפעלה.</span>
            </div>
            <p className={styles.billingDetail}>
              לאחר תום הניסיון, אם לא הופעל מנוי בתשלום — עמוד העסק יעבור למצב מושהה: התוכן יישמר במלואו, אך
              העמוד לא יוצג לציבור עד להפעלת מנוי. {priceLine}
            </p>
            <p className={styles.billingDetail}>בשלב זה לא נדרש אמצעי תשלום להפעלת הניסיון.</p>
          </div>

          <div className={styles.actionBox}>
            {eligibility.eligible ? (
              <TrialStartForm />
            ) : (
              <p className={styles.notice} role="status">
                {ELIGIBILITY_MESSAGE[eligibility.reason] ?? "לא ניתן להתחיל ניסיון כרגע."}
                {eligibility.reason === "not-authenticated" && (
                  <>
                    {" "}
                    <Link href="/business/owner/login">כניסה לחשבון בעל/ת העסק</Link>.
                  </>
                )}
              </p>
            )}
          </div>

          <p className={styles.legalLinks}>
            בהרשמה אתם מאשרים את <Link href="/terms">תנאי השימוש</Link> ואת{" "}
            <Link href="/privacy">מדיניות הפרטיות</Link>.
          </p>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

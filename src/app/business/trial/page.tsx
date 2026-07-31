import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CircleCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { ViewerSwitcher } from "@/components/demo/ViewerSwitcher/ViewerSwitcher";
import { TrialStartForm } from "./TrialStartForm";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { checkTrialEligibility } from "@/domain/check-trial-eligibility";
import { BUSINESS_MONTHLY_PLAN } from "@/types/subscription-plan";
import type { TrialEligibility } from "@/types/trial";
import styles from "./trial.module.css";

export const metadata: Metadata = {
  title: "התחלת חודש חינם | עסקים בנווה שמיר",
  description: "פתחו עמוד עסק בפורטל נווה שמיר עם חודש ראשון חינם, ולאחר מכן מנוי חודשי.",
  robots: { index: false, follow: false },
};

const ELIGIBILITY_MESSAGE: Record<string, string> = {
  "not-authenticated": "כדי להתחיל ניסיון יש להיכנס במצב הדגמה כבעל/ת עסק — ניתן לבחור זהות בסרגל הצהוב למעלה.",
  "business-not-owned": "החשבון המחובר אינו משויך לעסק.",
  "active-subscription": "לעסק שלכם כבר יש מנוי פעיל — ניתן לנהל אותו מהדשבורד.",
  "trial-already-used": "תקופת הניסיון החינמית כבר נוצלה עבור העסק שלכם. ניתן להפעיל מנוי מהדשבורד כדי לחזור לפרסום.",
};

export default async function BusinessTrialPage() {
  const viewer = await authAdapter.getCurrentUser();
  const businessId = viewer?.ownedBusinessIds[0];
  const business = viewer && businessId ? await businessRepository.getDraftById(businessId, viewer.id) : null;
  const existingSubscription = businessId ? await subscriptionRepository.getByBusinessId(businessId) : null;

  let eligibility: TrialEligibility;
  if (!viewer) {
    eligibility = { eligible: false, reason: "not-authenticated" };
  } else if (!business) {
    eligibility = { eligible: false, reason: "business-not-owned" };
  } else {
    eligibility = checkTrialEligibility(business, existingSubscription, viewer);
  }

  const priceLine =
    BUSINESS_MONTHLY_PLAN.priceAmount === null
      ? "המחיר יעודכן לפני ההשקה."
      : `${BUSINESS_MONTHLY_PLAN.priceAmount} ${BUSINESS_MONTHLY_PLAN.currency} לחודש לאחר תום הניסיון.`;

  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <ViewerSwitcher currentViewerId={viewer?.id ?? null} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>העסק שלכם מתחיל חודש חינם</h1>
          <p className={styles.subtitle}>
            30 ימים להתנסות מלאה בעמוד עסק בפורטל נווה שמיר — כל היכולות פתוחות, ללא כרטיס אשראי מראש.
          </p>

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
              <span>משך הניסיון: 30 ימים בדיוק, החל מרגע ההצטרפות.</span>
            </div>
            <p className={styles.billingDetail}>
              לאחר תום הניסיון, אם לא הופעל מנוי בתשלום — עמוד העסק יעבור למצב מושהה: התוכן יישמר במלואו, אך
              העמוד לא יוצג לציבור עד להפעלת מנוי. {priceLine}
            </p>
            <p className={styles.billingDetail}>לא נדרש אמצעי תשלום כדי להתחיל את הניסיון.</p>
            <p className={styles.billingDetail}>
              ניתן לבטל בכל שלב מהדשבורד; אם בוטל לפני תום הניסיון, העמוד יישאר פעיל עד סוף ה־30 יום ולא יחויב דבר.
            </p>
          </div>

          <div className={styles.actionBox}>
            {eligibility.eligible ? (
              <TrialStartForm />
            ) : (
              <p className={styles.notice} role="status">
                {ELIGIBILITY_MESSAGE[eligibility.reason] ?? "לא ניתן להתחיל ניסיון כרגע."}
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

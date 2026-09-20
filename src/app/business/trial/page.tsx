import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CircleCheck } from "lucide-react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { ViewerSwitcher } from "@/components/demo/ViewerSwitcher/ViewerSwitcher";
import { TrialStartForm } from "./TrialStartForm";
import { authAdapter, isRealBusinessOwnerSession } from "@/adapters/mock-auth-adapter";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { businessRepository } from "@/repositories/mock-business-repository";
import { getBusinessPlan } from "@/data/business-plans";
import { LAUNCH_PRICE_LABEL, TRIAL_DAYS, formatPriceWithInterval, getCurrentPrice, isBillingInterval } from "@/data/subscription-pricing";
import type { TrialEligibility } from "@/types/trial";
import styles from "./trial.module.css";

export const metadata: Metadata = {
  title: "הפעלת 30 ימי ניסיון | עסקים בנווה שמיר",
  description: "פתחו עמוד עסק מלא בפורטל נווה שמיר עם 30 ימי ניסיון חינם. לא נדרש אמצעי תשלום ולא מתבצע חיוב.",
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

  const business = viewer && businessId ? await businessRepository.getDraftById(businessId, viewer.id) : null;
  const planTier = business?.selectedPlanId === "premium" ? "premium" : "plus";
  const plan = getBusinessPlan(planTier);
  const interval = isBillingInterval(business?.selectedBillingInterval) ? business.selectedBillingInterval : "monthly";
  const offer = getCurrentPrice(planTier, interval);
  const priceLine = `המסלול שבחרתם: ${plan.name}, ${formatPriceWithInterval(offer.amountIls, interval)}${offer.isLaunchPrice ? ` (${LAUNCH_PRICE_LABEL})` : ""}. עדיין לא מתבצע חיוב, וסליקה טרם חוברה.`;

  return (
    <>
      <ConnectedHeader />
      {!isRealSession && <ViewerSwitcher currentViewerId={viewer?.id ?? null} />}
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>מפעילים את עמוד העסק המלא</h1>
          <p className={styles.subtitle}>
            {TRIAL_DAYS} ימי ניסיון להתנסות מלאה בעמוד עסק בפורטל נווה שמיר, ללא כרטיס אשראי.
          </p>

          <p className={styles.featuresHeading}>מה כלול</p>
          <ul className={styles.features}>
            {plan.features.map((feature) => (
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

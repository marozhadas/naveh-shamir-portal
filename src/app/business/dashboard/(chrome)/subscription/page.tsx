import type { Metadata } from "next";
import { SubscriptionStatusCard } from "@/components/business-dashboard/SubscriptionStatusCard/SubscriptionStatusCard";
import { BUSINESS_MONTHLY_PLAN } from "@/types/subscription-plan";
import { resolveDashboardViewer } from "../../resolve-dashboard-viewer";
import styles from "./subscription.module.css";

export const metadata: Metadata = { title: "ניהול מנוי | דשבורד | נווה שמיר", robots: { index: false, follow: false } };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BusinessSubscriptionPage() {
  const view = await resolveDashboardViewer();

  if (view.kind !== "ready") {
    return <p className={styles.notice}>יש להיכנס במצב הדגמה כבעל/ת עסק כדי לנהל את המנוי.</p>;
  }

  const { subscription } = view;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>ניהול מנוי</h1>

      <div className={styles.planCard}>
        <p className={styles.planName}>{BUSINESS_MONTHLY_PLAN.name}</p>
        <p className={styles.planPrice}>
          {BUSINESS_MONTHLY_PLAN.priceAmount === null
            ? "המחיר יעודכן לפני ההשקה"
            : `${BUSINESS_MONTHLY_PLAN.priceAmount} ${BUSINESS_MONTHLY_PLAN.currency} לחודש`}
        </p>
        <ul className={styles.featureList}>
          {BUSINESS_MONTHLY_PLAN.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>

      <SubscriptionStatusCard subscription={subscription} access={view.access} variant="full" />

      {subscription && (
        <dl className={styles.detailsList}>
          <div>
            <dt>תחילת תקופת ניסיון</dt>
            <dd>{formatDate(subscription.trialStartedAt)}</dd>
          </div>
          <div>
            <dt>סיום תקופת ניסיון</dt>
            <dd>{formatDate(subscription.trialEndsAt)}</dd>
          </div>
          {subscription.currentPeriodEndsAt && (
            <div>
              <dt>סיום תקופת החיוב הנוכחית</dt>
              <dd>{formatDate(subscription.currentPeriodEndsAt)}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

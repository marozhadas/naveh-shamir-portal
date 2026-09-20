import type { Metadata } from "next";
import { SubscriptionStatusCard } from "@/components/business-dashboard/SubscriptionStatusCard/SubscriptionStatusCard";
import { getSubscriptionSummary } from "@/domain/get-subscription-summary";
import { getBusinessPlan } from "@/data/business-plans";
import { BILLING_INTERVAL_LABEL, LAUNCH_PRICE_LABEL, formatPriceWithInterval } from "@/data/subscription-pricing";
import { isSupabaseBusinessId } from "@/utils/business-id";
import { resolveDashboardViewer } from "../../resolve-dashboard-viewer";
import styles from "./subscription.module.css";

export const metadata: Metadata = { title: "המנוי שלי | דשבורד | נווה שמיר", robots: { index: false, follow: false } };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Jerusalem" });
}

export default async function BusinessSubscriptionPage() {
  const view = await resolveDashboardViewer();

  if (view.kind !== "ready") {
    return <p className={styles.notice}>יש להיכנס במצב הדגמה כבעל/ת עסק כדי לנהל את המנוי.</p>;
  }

  const { subscription, business } = view;
  const isRealSubscription = isSupabaseBusinessId(business.id);
  const summary = getSubscriptionSummary({ business, subscription, access: view.access, selfEditAccess: view.selfEditAccess, now: new Date() });
  const plan = getBusinessPlan(summary.planId === "basic" ? "free" : summary.planId);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>המנוי שלי</h1>

      <section className={styles.planCard} aria-labelledby="subscription-status-heading">
        <p className={styles.planName}>{summary.planName}</p>
        <h2 id="subscription-status-heading" className={styles.statusHeading}>
          {summary.statusLabel}
        </h2>
        <p className={styles.statusDescription}>{summary.statusDescription}</p>
      </section>

      <dl className={styles.detailsList}>
        <div>
          <dt>חבילה</dt>
          <dd>{summary.planName}</dd>
        </div>
        {summary.planId !== "basic" && (
          <>
            <div>
              <dt>מסלול</dt>
              <dd>{summary.billingInterval ? BILLING_INTERVAL_LABEL[summary.billingInterval] : "לא נבחר"}</dd>
            </div>
            <div>
              <dt>{summary.price?.source === "assigned" ? "מחיר המנוי שהוקצה" : "מחיר ההצטרפות הנוכחי"}</dt>
              <dd>
                {summary.price ? (
                  <>
                    {formatPriceWithInterval(summary.price.amountIls, summary.price.interval)}
                    {summary.price.isLaunchPrice && <span className={styles.launchBadge}>{LAUNCH_PRICE_LABEL}</span>}
                  </>
                ) : (
                  "טרם נקבע"
                )}
              </dd>
            </div>
          </>
        )}
        <div>
          <dt>סטטוס</dt>
          <dd>{summary.statusLabel}</dd>
        </div>
        {summary.trial && (
          <>
            <div>
              <dt>תחילת תקופת הניסיון</dt>
              <dd>{formatDate(summary.trial.startedAt)}</dd>
            </div>
            <div>
              <dt>סיום תקופת הניסיון</dt>
              <dd>{formatDate(summary.trial.endsAt)}</dd>
            </div>
          </>
        )}
        {summary.gracePeriodEndsAt && (
          <div>
            <dt>סיום תקופת החסד</dt>
            <dd>{formatDate(summary.gracePeriodEndsAt)}</dd>
          </div>
        )}
        {summary.nextBillingDate && (
          <div>
            <dt>מועד חיוב</dt>
            <dd>{formatDate(summary.nextBillingDate)}</dd>
          </div>
        )}
        <div>
          <dt>עריכת העסק</dt>
          <dd>{summary.editLimit.label}</dd>
        </div>
      </dl>
      <p className={styles.notice}>{summary.editLimit.detail}</p>

      {summary.planId !== "basic" && summary.price?.source === "current-offer" && (
        <p className={styles.notice}>
          המחיר המוצג הוא מחיר ההשקה הנוכחי להצטרפות. הוא יוקצה למנוי רק עם תחילת תקופת הניסיון, ולאחר מכן לא ישתנה אוטומטית אם מחירי ההשקה יתעדכנו בעתיד.
        </p>
      )}

      {isRealSubscription && summary.planId !== "basic" && (
        <p className={styles.notice} role="status">
          סליקה עדיין לא הופעלה בפורטל: לא מתבצע חיוב, לא נאספים פרטי אשראי, ולא נקבע מועד חיוב. בשלב זה אפשר להפעיל רק את 30 ימי הניסיון החינמיים.
        </p>
      )}

      <SubscriptionStatusCard
        subscription={subscription}
        access={view.access}
        variant="full"
        isRealSubscription={isRealSubscription}
        businessSlug={business.slug}
        blockedReason={summary.stage === "awaiting-approval" ? "awaiting-approval" : null}
      />

      <div className={styles.planCard}>
        <p className={styles.planName}>מה כלולה בחבילת {plan.name}</p>
        <ul className={styles.featureList}>
          {plan.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        {plan.notIncluded.length > 0 && (
          <ul className={styles.featureList} aria-label="מה לא כלול">
            {plan.notIncluded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

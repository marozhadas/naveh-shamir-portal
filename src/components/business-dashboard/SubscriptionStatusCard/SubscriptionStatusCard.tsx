import { Button } from "@/components/ui/Button";
import { TrialProgressBar } from "@/components/business-dashboard/TrialProgressBar/TrialProgressBar";
import { startCheckoutAction, cancelSubscriptionAction, reactivateSubscriptionAction } from "@/app/business/dashboard/subscription-actions";
import { MOCK_PAYMENT_DISCLAIMER } from "@/adapters/mock-payment-provider-adapter";
import { BUSINESS_MONTHLY_PLAN } from "@/types/subscription-plan";
import type { BusinessSubscription, SubscriptionAccess } from "@/types/subscription";
import styles from "./SubscriptionStatusCard.module.css";

type SubscriptionStatusCardProps = {
  subscription: BusinessSubscription | null;
  access: SubscriptionAccess | null;
  /** "compact" (dashboard overview) hides the mock-payment fine print and secondary actions. */
  variant?: "compact" | "full";
  /**
   * true for a real, Supabase-backed business (see isSupabaseBusinessId). No real billing exists
   * yet (spec: "no fake checkout"), so real businesses never see the demo mock-payment
   * checkout/cancel forms below — only navigation to real pages (trial, profile editor, public
   * page, or a "coming soon" subscription screen).
   */
  isRealSubscription?: boolean;
  /** The business's public slug, when it has one — used for the "view public page" link during an active trial. */
  businessSlug?: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

export function SubscriptionStatusCard({
  subscription,
  access,
  variant = "full",
  isRealSubscription = false,
  businessSlug = null,
}: SubscriptionStatusCardProps) {
  if (!subscription || !access) {
    return (
      <div className={`${styles.card} ${styles.neutral}`}>
        <p className={styles.title}>העסק שלך מופיע כרגע ברישום בסיסי</p>
        <p className={styles.description}>
          הפעילו עמוד עסק מלא כדי להציג שירותים, תמונות, שעות פעילות ותגית עסק מאומת.
        </p>
        <Button href={isRealSubscription ? "/business/trial" : "/business/register"} variant="accent">
          הפעלת 30 ימי ניסיון
        </Button>
      </div>
    );
  }

  if (access.reason === "trial-active" && access.daysRemainingInTrial !== null) {
    return (
      <div className={`${styles.card} ${styles.positive}`}>
        <p className={styles.title}>החודש הראשון שלכם פעיל</p>
        <TrialProgressBar daysRemaining={access.daysRemainingInTrial} />
        {variant === "full" && isRealSubscription && (
          <div className={styles.ctaRow}>
            <Button href="/business/dashboard/profile" variant="secondary" size="compact">
              עריכת עמוד העסק
            </Button>
            {businessSlug && (
              <Button href={`/businesses/${businessSlug}`} variant="secondary" size="compact">
                צפייה בעמוד הציבורי
              </Button>
            )}
          </div>
        )}
        {variant === "full" && !isRealSubscription && (
          <>
            <form action={startCheckoutAction} className={styles.formInline}>
              <Button type="submit" variant="accent">
                הפעלת מנוי להמשך
              </Button>
            </form>
            <p className={styles.finePrint}>{MOCK_PAYMENT_DISCLAIMER}</p>
          </>
        )}
      </div>
    );
  }

  if (subscription.status === "active") {
    const nextBilling = subscription.currentPeriodEndsAt ? formatDate(subscription.currentPeriodEndsAt) : null;
    return (
      <div className={`${styles.card} ${styles.positive}`}>
        <p className={styles.title}>המנוי פעיל</p>
        {nextBilling && <p className={styles.description}>החיוב הבא בתאריך {nextBilling}</p>}
        {variant === "full" && !isRealSubscription && (
          <form action={cancelSubscriptionAction} className={styles.formInline}>
            <Button type="submit" variant="secondary" size="compact">
              ביטול המנוי
            </Button>
          </form>
        )}
      </div>
    );
  }

  if (access.reason === "payment-past-due") {
    return (
      <div className={`${styles.card} ${styles.warning}`}>
        <p className={styles.title}>לא הצלחנו להשלים את התשלום</p>
        <p className={styles.description}>עדכנו את אמצעי התשלום כדי לשמור על העמוד פעיל.</p>
        {variant === "full" && !isRealSubscription && (
          <form action={startCheckoutAction} className={styles.formInline}>
            <Button type="submit" variant="accent">
              עדכון אמצעי תשלום
            </Button>
          </form>
        )}
      </div>
    );
  }

  if (subscription.status === "canceled") {
    const endDate = subscription.currentPeriodEndsAt ? formatDate(subscription.currentPeriodEndsAt) : null;
    return (
      <div className={`${styles.card} ${styles.warning}`}>
        <p className={styles.title}>{endDate ? `המנוי יבוטל בתאריך ${endDate}` : "המנוי יבוטל בסוף התקופה הנוכחית"}</p>
        <p className={styles.description}>העמוד שלכם ימשיך להיות מוצג עד לתאריך זה. ניתן לבטל את בקשת הביטול בכל שלב.</p>
        {variant === "full" && !isRealSubscription && (
          <form action={reactivateSubscriptionAction} className={styles.formInline}>
            <Button type="submit" variant="secondary">
              ביטול בקשת הביטול
            </Button>
          </form>
        )}
      </div>
    );
  }

  if (access.reason === "trial-expired" || subscription.status === "expired") {
    return (
      <div className={`${styles.card} ${styles.warning}`}>
        <p className={styles.title}>תקופת הניסיון הסתיימה</p>
        <p className={styles.description}>
          כל התוכן שלכם שמור, ולא נמחק. העמוד הציבורי אינו מוצג כרגע עד להפעלת מנוי.
        </p>
        {variant === "full" && isRealSubscription && (
          <div className={styles.ctaRow}>
            <Button href="/business/dashboard/subscription" variant="accent">
              אפשרויות מנוי (בקרוב)
            </Button>
          </div>
        )}
        {variant === "full" && !isRealSubscription && (
          <>
            <form action={startCheckoutAction} className={styles.formInline}>
              <Button type="submit" variant="accent">
                הפעלת מנוי והחזרת העסק לאוויר
              </Button>
            </form>
            <p className={styles.finePrint}>
              {BUSINESS_MONTHLY_PLAN.priceAmount === null ? "המחיר יעודכן לפני ההצטרפות." : `${BUSINESS_MONTHLY_PLAN.priceAmount} ${BUSINESS_MONTHLY_PLAN.currency} לחודש.`}{" "}
              {MOCK_PAYMENT_DISCLAIMER}
            </p>
          </>
        )}
      </div>
    );
  }

  // paused
  return (
    <div className={`${styles.card} ${styles.neutral}`}>
      <p className={styles.title}>המנוי מושהה כרגע</p>
      <p className={styles.description}>פנו לתמיכת הפורטל לפרטים נוספים.</p>
    </div>
  );
}

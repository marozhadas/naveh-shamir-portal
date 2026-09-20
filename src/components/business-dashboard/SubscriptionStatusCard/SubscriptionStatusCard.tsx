import { Button } from "@/components/ui/Button";
import { TrialProgressBar } from "@/components/business-dashboard/TrialProgressBar/TrialProgressBar";
import { startCheckoutAction, cancelSubscriptionAction, reactivateSubscriptionAction } from "@/app/business/dashboard/subscription-actions";
import { MOCK_PAYMENT_DISCLAIMER } from "@/adapters/mock-payment-provider-adapter";
import { isValidBusinessSlug } from "@/utils/business-slug";
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
  /** Set when the trial cannot be offered yet for a reason the owner should see instead of a button. */
  blockedReason?: "awaiting-approval" | null;
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
  blockedReason = null,
}: SubscriptionStatusCardProps) {
  if (!subscription || !access) {
    if (blockedReason === "awaiting-approval") {
      return (
        <div className={`${styles.card} ${styles.neutral}`}>
          <p className={styles.title}>העסק ממתין לאישור צוות הפורטל</p>
          <p className={styles.description}>לאחר האישור תוכלו להפעיל את 30 ימי הניסיון. תקופת הניסיון לא מתחילה לפני כן.</p>
        </div>
      );
    }

    // A real business needs a clean English slug before the trial can actually start (see
    // checkRealTrialEligibility's "invalid-slug" check) — the auto-generated slug from a Hebrew
    // business name never qualifies. Blocking the button here (instead of letting the owner click
    // through to a dead end on /business/trial) surfaces this immediately, with a pointer to what
    // to do about it, rather than a generic "can't start" message after the fact.
    const needsSlug = isRealSubscription && !(businessSlug && isValidBusinessSlug(businessSlug));

    return (
      <div className={`${styles.card} ${styles.neutral}`}>
        <p className={styles.title}>העסק שלך מופיע כרגע ברישום בסיסי</p>
        <p className={styles.description}>
          הפעילו עמוד עסק מלא כדי להציג שירותים, תמונות, שעות פעילות ותגית עסק מאומת.
        </p>
        {needsSlug ? (
          <>
            <Button variant="accent" disabled>
              הפעלת 30 ימי ניסיון
            </Button>
            <p className={styles.description}>
              לפני הפעלת המנוי יש להגדיר כתובת URL באנגלית לעסק. הצוות שלנו ייצור איתך קשר בקרוב — אפשר גם לפנות אלינו ישירות דרך עמוד יצירת הקשר.
            </p>
          </>
        ) : (
          <Button href={isRealSubscription ? "/business/trial" : "/business/register"} variant="accent">
            הפעלת 30 ימי ניסיון
          </Button>
        )}
      </div>
    );
  }

  if (access.reason === "trial-active" && access.daysRemainingInTrial !== null) {
    return (
      <div className={`${styles.card} ${styles.positive}`}>
        <p className={styles.title}>30 ימי הניסיון שלכם פעילים</p>
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
    // Only demo subscriptions show a billing date — no real payment provider is connected, so a real business never sees one as a commitment.
    const nextBilling = !isRealSubscription && subscription.currentPeriodEndsAt ? formatDate(subscription.currentPeriodEndsAt) : null;
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

  if (access.reason === "grace-period") {
    return (
      <div className={`${styles.card} ${styles.warning}`}>
        <p className={styles.title}>תקופת חסד — התגלתה בעיה בחיוב</p>
        <p className={styles.description}>
          {subscription.gracePeriodEndsAt ? `העמוד ממשיך להיות מוצג עד ${formatDate(subscription.gracePeriodEndsAt)}. ` : ""}
          כדי להמשיך לפרסם יש לפתור את בעיית החיוב לפני סיום תקופת החסד. התוכן שלכם שמור.
        </p>
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
          <>
            <p className={styles.description}>תשלום מקוון עדיין אינו זמין. להמשך פרסום העמוד אפשר לפנות לצוות הפורטל.</p>
            <div className={styles.ctaRow}>
              <Button href="/contact" variant="accent">
                פנייה לצוות הפורטל
              </Button>
            </div>
          </>
        )}
        {variant === "full" && !isRealSubscription && (
          <>
            <form action={startCheckoutAction} className={styles.formInline}>
              <Button type="submit" variant="accent">
                הפעלת מנוי והחזרת העסק לאוויר
              </Button>
            </form>
            <p className={styles.finePrint}>{MOCK_PAYMENT_DISCLAIMER}</p>
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

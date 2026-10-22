import { getPayMeConfig } from "@/lib/payme/config";
import { isPayMeProviderActive } from "@/lib/payme/dormant";
import { BusinessBillingTestControl } from "./BusinessBillingTestControl";
import styles from "./detail.module.css";

export const SUMIT_TEST_TRACK_NOTICE = "מסלול בדיקות SUMIT מנוהל בנפרד. אין כאן מתג הפעלה.";

type BillingTestSectionProps = {
  businessId: string;
  enabled: boolean;
  hasPayMeSubscription: boolean;
};

/**
 * The admin's billing-test block of a business page. While PayMe is dormant - always, because PAYMENTS_PROVIDER can only select
 * SUMIT - the PayMe "בדיקת סליקה (Sandbox)" switch is NOT drawn: a plain notice says the SUMIT test track is managed separately.
 * (The server action refuses the switch in that state too - changeBusinessBillingTestAction - so hiding it is not the guard.)
 * The PayMe control itself stays in the code for rollback and for the cleanup in docs/payme-cleanup.md.
 */
export function BillingTestSection({ businessId, enabled, hasPayMeSubscription }: BillingTestSectionProps) {
  if (!isPayMeProviderActive()) {
    return (
      <section className={styles.section} aria-labelledby="billing-test-heading">
        <h2 id="billing-test-heading" className={styles.sectionTitle}>
          בדיקת סליקה
        </h2>
        <p className={styles.hint}>{SUMIT_TEST_TRACK_NOTICE}</p>
      </section>
    );
  }
  return <BusinessBillingTestControl businessId={businessId} enabled={enabled} payMeEnv={getPayMeConfig()?.env ?? null} hasPayMeSubscription={hasPayMeSubscription} />;
}

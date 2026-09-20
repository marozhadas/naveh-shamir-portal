import { BILLING_INTERVAL_LABEL, LAUNCH_PRICE_LABEL, formatPriceWithInterval, type BillingInterval } from "@/data/subscription-pricing";
import type { PriceSnapshot } from "@/data/subscription-pricing";
import styles from "./PlanPriceBlock.module.css";

type PlanPriceBlockProps = {
  monthly: PriceSnapshot;
  yearly: PriceSnapshot;
  /** When set, only that billing track is shown (used where the track is already chosen). */
  only?: BillingInterval;
};

/**
 * The one place both billing tracks are rendered, each with its own explicit "מחיר השקה" label when
 * its price is a launch price. Never invents a regular price, a discount or an end date.
 */
export function PlanPriceBlock({ monthly, yearly, only }: PlanPriceBlockProps) {
  const rows = [monthly, yearly].filter((price) => !only || price.billingInterval === only);
  return (
    <ul className={styles.list}>
      {rows.map((price) => (
        <li key={price.billingInterval} className={styles.row}>
          <span className={styles.track}>{BILLING_INTERVAL_LABEL[price.billingInterval]}</span>
          <span className={styles.amount}>{formatPriceWithInterval(price.amountIls, price.billingInterval)}</span>
          {price.isLaunchPrice && <span className={styles.launchBadge}>{LAUNCH_PRICE_LABEL}</span>}
        </li>
      ))}
    </ul>
  );
}

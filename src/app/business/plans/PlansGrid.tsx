"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BillingIntervalToggle } from "@/components/pricing/BillingIntervalToggle";
import { LAUNCH_PRICE_LABEL, formatPriceWithInterval, type BillingInterval } from "@/data/subscription-pricing";
import type { BusinessPlan } from "@/data/business-plans";
import styles from "./plans.module.css";

type PlansGridProps = {
  plans: BusinessPlan[];
};

/** Appends the chosen billing track to a paid plan's registration link, so the wizard can default to it. Basic's link never carries this — it has no billing track. */
function ctaHrefFor(plan: BusinessPlan, interval: BillingInterval): string {
  return plan.pricing ? `${plan.ctaHref}?interval=${interval}` : plan.ctaHref;
}

export function PlansGrid({ plans }: PlansGridProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <>
      <div className={styles.intervalToggleRow}>
        <BillingIntervalToggle value={interval} onChange={setInterval} label="מסלול חיוב: חודשי או שנתי" />
      </div>

      <div className={styles.grid}>
        {plans.map((plan) => {
          const price = plan.pricing ? plan.pricing[interval] : null;
          return (
            <div key={plan.tier} className={`${styles.card} ${plan.highlighted ? styles.highlighted : ""}`}>
              {plan.highlighted && <span className={styles.badge}>הכי פופולרי</span>}
              <h2 className={styles.planName}>{plan.name}</h2>
              {price ? (
                <p className={styles.price}>
                  {formatPriceWithInterval(price.amountIls, price.billingInterval)}
                  {price.isLaunchPrice && <span className={styles.launchBadge}>{LAUNCH_PRICE_LABEL}</span>}
                </p>
              ) : (
                <p className={styles.price}>חינם</p>
              )}
              {plan.trialDays && <p className={styles.trialNote}>{plan.trialDays} ימי ניסיון חינם, במסלול החודשי ובמסלול השנתי</p>}
              <p className={styles.planDescription}>{plan.description}</p>
              <ul className={styles.featureList}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.notIncluded.length > 0 && (
                <ul className={styles.notIncludedList} aria-label="מה לא כלול">
                  {plan.notIncluded.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <Button href={ctaHrefFor(plan, interval)} variant={plan.highlighted ? "accent" : "primary"} fullWidth>
                {plan.ctaLabel}
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

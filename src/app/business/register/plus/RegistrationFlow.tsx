"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { LAUNCH_PRICE_LABEL, TRIAL_DAYS, formatPriceWithInterval, type BillingInterval, type PriceSnapshot } from "@/data/subscription-pricing";
import { PlusRegistrationWizard } from "./PlusRegistrationWizard";
import styles from "./plus-wizard.module.css";

type RegistrationFlowProps = {
  planId: "plus" | "premium";
  planName: string;
  /** Straight from subscription-pricing.ts (via BUSINESS_PLANS) — this component stores no price of its own. */
  pricing: { monthly: PriceSnapshot; yearly: PriceSnapshot };
  features: ReactNode[];
  initialBillingInterval: BillingInterval;
  billingIntervalFromUrl: boolean;
  /** Server-verified: only then is the wizard mounted; otherwise `gate` (the sign-in screen) is shown. */
  authenticated: boolean;
  gate: ReactNode;
};

/**
 * The registration layout: wizard (or sign-in gate) beside the plan summary card. It owns the ONE
 * client-side copy of "which billing track is selected" so the card always shows exactly the track
 * the owner chose — the one carried from /business/plans through login, or the one they switch to
 * inside the wizard — and nothing else. The wizard keeps its own `billingInterval` as the value that
 * is actually submitted and reports every change up here.
 */
export function RegistrationFlow({
  planId,
  planName,
  pricing,
  features,
  initialBillingInterval,
  billingIntervalFromUrl,
  authenticated,
  gate,
}: RegistrationFlowProps) {
  const [interval, setInterval] = useState<BillingInterval>(initialBillingInterval);
  const price = pricing[interval];

  const handleIntervalChange = useCallback((next: BillingInterval) => {
    setInterval(next);
    // Keep the URL truthful so a refresh / back / forward lands on the same selection, not on the
    // value the page was first opened with. No navigation, no re-render of the server page.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("interval") !== next) {
        url.searchParams.set("interval", next);
        window.history.replaceState(window.history.state, "", url);
      }
    } catch {
      // History API unavailable — the card still updates, only URL sync is skipped.
    }
  }, []);

  return (
    <div className={styles.layout}>
      {authenticated ? (
        <PlusRegistrationWizard
          planId={planId}
          initialBillingInterval={initialBillingInterval}
          billingIntervalFromUrl={billingIntervalFromUrl}
          onBillingIntervalChange={handleIntervalChange}
        />
      ) : (
        gate
      )}

      <aside className={styles.summaryCard} aria-label={`סיכום חבילת ${planName}`}>
        <p className={styles.summaryPlanName}>{planName}</p>
        <p className={styles.summaryPrice} data-testid="summary-price" aria-live="polite">
          {formatPriceWithInterval(price.amountIls, interval)}
        </p>
        {price.isLaunchPrice && <p className={styles.summaryLaunchLabel}>{LAUNCH_PRICE_LABEL}</p>}
        <p className={styles.summaryBillingNote}>{TRIAL_DAYS} ימי ניסיון חינם</p>
        <ul className={styles.summaryFeatureList}>
          {features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
        <Link href="/business/plans" className={styles.summaryBackLink}>
          חזרה להשוואת החבילות
        </Link>
      </aside>
    </div>
  );
}

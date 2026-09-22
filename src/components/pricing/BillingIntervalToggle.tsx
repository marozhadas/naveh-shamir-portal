"use client";

import { BILLING_INTERVALS, BILLING_INTERVAL_LABEL, type BillingInterval } from "@/data/subscription-pricing";
import styles from "./BillingIntervalToggle.module.css";

type BillingIntervalToggleProps = {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
  /** Accessible name for the group — no visible <legend>/<label> is rendered above the switch itself. */
  label: string;
};

/**
 * A single shared control (radiogroup semantics, arrow-key navigable like a native radio group)
 * that switches every plan card's displayed price at once — no page reload, no per-card state.
 */
export function BillingIntervalToggle({ value, onChange, label }: BillingIntervalToggleProps) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={label}>
      {BILLING_INTERVALS.map((interval) => (
        <button
          key={interval}
          type="button"
          role="radio"
          aria-checked={value === interval}
          tabIndex={value === interval ? 0 : -1}
          className={`${styles.option} ${value === interval ? styles.optionActive : ""}`}
          onClick={() => onChange(interval)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const currentIndex = BILLING_INTERVALS.indexOf(value);
            const nextIndex = (currentIndex + (event.key === "ArrowLeft" ? 1 : -1) + BILLING_INTERVALS.length) % BILLING_INTERVALS.length;
            onChange(BILLING_INTERVALS[nextIndex]);
          }}
        >
          {BILLING_INTERVAL_LABEL[interval]}
        </button>
      ))}
    </div>
  );
}

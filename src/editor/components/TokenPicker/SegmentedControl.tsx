"use client";

import styles from "./SegmentedControl.module.css";

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ label, value, options, labels, onChange }: SegmentedControlProps<T>) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.group} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={`${styles.option} ${value === option ? styles.optionActive : ""}`}
            onClick={() => onChange(option)}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

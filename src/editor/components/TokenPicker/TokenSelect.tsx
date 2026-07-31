"use client";

import { useId } from "react";
import styles from "../EditorField/EditorField.module.css";

type TokenSelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
};

/**
 * Generic reusable <select> for any bounded token union (spacing, font size,
 * font weight, radius, shadow, container width, ...) — a native element, so
 * it's keyboard-operable and accessible with zero extra ARIA plumbing, and it
 * can only ever produce one of the `options` values, never a free string.
 */
export function TokenSelect<T extends string>({ label, value, options, labels, onChange }: TokenSelectProps<T>) {
  const id = useId();
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      </div>
      <select id={id} className={styles.select} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

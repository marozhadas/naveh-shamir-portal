"use client";

import { useId, useState } from "react";
import { isSafeHref, isSafeHrefOrEmpty } from "@/editor/utils/validate-href";
import styles from "@/editor/components/EditorField/EditorField.module.css";

type LinkControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** When true, an empty value is invalid too (e.g. a CTA that must always link somewhere). */
  required?: boolean;
  placeholder?: string;
};

/**
 * Shared URL field (spec: no javascript:/data: URLs anywhere). Only commits a change once the
 * draft is safe, mirroring TextField's gated pattern — an in-progress invalid value is shown
 * (with an inline error) but never reaches the underlying settings object.
 */
export function LinkControl({ label, value, onChange, required, placeholder }: LinkControlProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [lastCommittedValue, setLastCommittedValue] = useState(value);
  if (value !== lastCommittedValue) {
    setLastCommittedValue(value);
    setDraft(value);
  }

  function isValid(candidate: string): boolean {
    return required ? isSafeHref(candidate) : isSafeHrefOrEmpty(candidate);
  }

  function handleInput(next: string) {
    setDraft(next);
    if (isValid(next)) onChange(next);
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        dir="ltr"
        className={styles.input}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => handleInput(event.target.value)}
      />
      {!isValid(draft) && (
        <span className={styles.error}>
          כתובת לא תקינה — יש להשתמש ב-https://, tel:, mailto:, נתיב פנימי (/) או עוגן (#)
        </span>
      )}
    </div>
  );
}

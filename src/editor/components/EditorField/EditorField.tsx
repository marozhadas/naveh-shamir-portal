"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./EditorField.module.css";

type FieldChromeProps = {
  label: string;
  htmlFor: string;
  maxLength?: number;
  currentLength?: number;
  error?: string;
  children: ReactNode;
};

function FieldChrome({ label, htmlFor, maxLength, currentLength, error, children }: FieldChromeProps) {
  const overLimit = maxLength !== undefined && (currentLength ?? 0) > maxLength;
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
        </label>
        {maxLength !== undefined && (
          <span className={`${styles.count} ${overLimit ? styles.countOverLimit : ""}`}>
            {currentLength ?? 0}/{maxLength}
          </span>
        )}
      </div>
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

/**
 * Text/textarea fields keep their own local "what the user is typing" state,
 * separate from the committed setting: per spec, going over maxLength shows
 * an error and must NOT be saved (and must NOT be silently truncated either)
 * — so the input keeps echoing exactly what was typed while `onChange`
 * (which updates the real, persisted setting) is only called while valid.
 */
function useGatedTextValue(committedValue: string, maxLength: number, onChange: (value: string) => void) {
  const [draft, setDraft] = useState(committedValue);

  // Adjusting state during render (React-endorsed pattern) instead of an effect, to stay in
  // sync when the committed value changes from outside (undo/redo/reset/load).
  const [lastCommittedValue, setLastCommittedValue] = useState(committedValue);
  if (committedValue !== lastCommittedValue) {
    setLastCommittedValue(committedValue);
    setDraft(committedValue);
  }

  const isOverLimit = draft.length > maxLength;

  function handleInput(nextDraft: string) {
    setDraft(nextDraft);
    if (nextDraft.length <= maxLength) onChange(nextDraft);
  }

  return { draft, isOverLimit, handleInput };
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  required?: boolean;
};

export function TextField({ label, value, onChange, maxLength, placeholder, required }: TextFieldProps) {
  const id = useId();
  const { draft, isOverLimit, handleInput } = useGatedTextValue(value, maxLength, onChange);
  const isEmpty = required && draft.trim().length === 0;

  return (
    <FieldChrome
      label={label}
      htmlFor={id}
      maxLength={maxLength}
      currentLength={draft.length}
      error={
        isOverLimit ? `הטקסט ארוך מדי — עד ${maxLength} תווים` : isEmpty ? "שדה חובה — לא ניתן להשאיר ריק" : undefined
      }
    >
      <input
        id={id}
        type="text"
        className={styles.input}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => handleInput(event.target.value)}
      />
    </FieldChrome>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
};

export function TextAreaField({ label, value, onChange, maxLength }: TextAreaFieldProps) {
  const id = useId();
  const { draft, isOverLimit, handleInput } = useGatedTextValue(value, maxLength, onChange);

  return (
    <FieldChrome
      label={label}
      htmlFor={id}
      maxLength={maxLength}
      currentLength={draft.length}
      error={isOverLimit ? `הטקסט ארוך מדי — עד ${maxLength} תווים` : undefined}
    >
      <textarea id={id} className={styles.textarea} value={draft} onChange={(event) => handleInput(event.target.value)} />
    </FieldChrome>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
};

/** Free-form pixel-value input (as opposed to a bounded token dropdown) — value is clamped to [min, max] on change. */
export function NumberField({ label, value, onChange, min, max, suffix }: NumberFieldProps) {
  const id = useId();
  return (
    <FieldChrome label={label} htmlFor={id}>
      <div className={styles.labelRow}>
        <input
          id={id}
          type="number"
          className={styles.input}
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next)) return;
            onChange(Math.min(max, Math.max(min, next)));
          }}
        />
        {suffix && <span className={styles.count}>{suffix}</span>}
      </div>
    </FieldChrome>
  );
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      </label>
    </div>
  );
}

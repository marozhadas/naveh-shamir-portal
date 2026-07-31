import { useId, type ReactNode } from "react";
import styles from "./Checkbox.module.css";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** Shown at the end of the row (e.g. a result count) — purely presentational, not read as part of the label. */
  trailing?: ReactNode;
  disabled?: boolean;
};

export function Checkbox({ checked, onChange, label, trailing, disabled }: CheckboxProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={`${styles.row} ${disabled ? styles.disabled : ""}`}>
      <span className={styles.labelGroup}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className={styles.input}
        />
        <span className={styles.label}>{label}</span>
      </span>
      {trailing !== undefined && <span className={styles.trailing}>{trailing}</span>}
    </label>
  );
}

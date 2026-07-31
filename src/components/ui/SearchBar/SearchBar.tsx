import { Search, X } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import styles from "./SearchBar.module.css";

type SearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  id: string;
  label: string;
  /** Opt-in: when provided, a clear (×) button is shown inside the field whenever `value` is non-empty. */
  onClear?: () => void;
};

export function SearchBar({ id, label, placeholder = "חפשו בשכונה...", onClear, value, ...rest }: SearchBarProps) {
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon} aria-hidden="true">
        <Search size={18} />
      </span>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        className={styles.input}
        value={value}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.form?.requestSubmit();
        }}
        {...rest}
      />
      {onClear && hasValue && (
        <button type="button" className={styles.clearButton} aria-label="ניקוי החיפוש" onClick={onClear}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

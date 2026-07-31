import { useId } from "react";
import { BUSINESS_SORT_OPTIONS } from "@/types/business-filters";
import type { BusinessSort } from "@/types/business-filters";
import styles from "./SortSelect.module.css";

const SORT_LABEL: Record<BusinessSort, string> = {
  featured: "מומלצים",
  "name-asc": "א׳–ת׳",
  "name-desc": "ת׳–א׳",
  newest: "החדשים ביותר",
};

type SortSelectProps = {
  value: BusinessSort;
  onChange: (value: BusinessSort) => void;
};

export function SortSelect({ value, onChange }: SortSelectProps) {
  const id = useId();
  return (
    <div className={styles.wrap}>
      <label htmlFor={id} className={styles.label}>
        מיון עסקים
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as BusinessSort)}
      >
        {BUSINESS_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABEL[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

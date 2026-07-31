import { X } from "lucide-react";
import { getCategoryLabel } from "@/data/business-categories";
import type { BusinessFilters } from "@/types/business-filters";
import styles from "./ActiveFilterChips.module.css";

type ActiveFilterChipsProps = {
  filters: BusinessFilters;
  onRemoveCategory: (categoryId: string) => void;
  onClearQuery: () => void;
  onClearAll: () => void;
};

export function ActiveFilterChips({ filters, onRemoveCategory, onClearQuery, onClearAll }: ActiveFilterChipsProps) {
  const hasActiveFilters = filters.categoryIds.length > 0 || filters.query.trim().length > 0;
  if (!hasActiveFilters) return null;

  return (
    <div className={styles.wrap} role="group" aria-label="סינונים פעילים">
      {filters.categoryIds.map((categoryId) => {
        const label = getCategoryLabel(categoryId);
        if (!label) return null;
        return (
          <button key={categoryId} type="button" className={styles.chip} onClick={() => onRemoveCategory(categoryId)}>
            {label}
            <X size={13} aria-hidden="true" />
            <span className="sr-only">הסרת סינון {label}</span>
          </button>
        );
      })}
      {filters.query.trim() && (
        <button type="button" className={styles.chip} onClick={onClearQuery}>
          {`חיפוש: "${filters.query.trim()}"`}
          <X size={13} aria-hidden="true" />
          <span className="sr-only">הסרת סינון חיפוש</span>
        </button>
      )}
      <button type="button" className={styles.clearAll} onClick={onClearAll}>
        ניקוי כל הסינונים
      </button>
    </div>
  );
}

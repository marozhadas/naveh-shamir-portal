import { useId } from "react";
import { X } from "lucide-react";
import { SearchBar } from "@/components/ui/SearchBar";
import { ESSENTIAL_NUMBER_CATEGORY_LABEL, ESSENTIAL_NUMBER_CATEGORY_OPTIONS } from "@/types/essential-number";
import { DEFAULT_ESSENTIAL_NUMBER_FILTERS } from "@/types/essential-number-filters";
import type { EssentialNumberFilters } from "@/types/essential-number-filters";
import type { EssentialNumberCategory } from "@/types/essential-number";
import styles from "./EssentialNumbersFilters.module.css";

type EssentialNumbersFiltersProps = {
  searchDraft: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  filters: EssentialNumberFilters;
  onChange: (filters: EssentialNumberFilters) => void;
};

export function EssentialNumbersFilters({ searchDraft, onSearchChange, onClearSearch, filters, onChange }: EssentialNumbersFiltersProps) {
  const searchId = useId();
  const isDefault = !searchDraft.trim() && !filters.category;

  function selectCategory(category: EssentialNumberCategory | "") {
    onChange({ ...filters, category });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SearchBar
          id={searchId}
          label="חיפוש מספרים חיוניים"
          placeholder="חיפוש לפי שם או שירות"
          value={searchDraft}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onClearSearch}
        />

        {!isDefault && (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              onClearSearch();
              onChange({ ...DEFAULT_ESSENTIAL_NUMBER_FILTERS });
            }}
          >
            <X size={14} aria-hidden="true" />
            איפוס סינון
          </button>
        )}
      </div>

      <div className={styles.categoryRow} role="group" aria-label="סינון לפי קטגוריה">
        <button
          type="button"
          className={`${styles.categoryChip} ${!filters.category ? styles.categoryChipActive : ""}`}
          aria-pressed={!filters.category}
          onClick={() => selectCategory("")}
        >
          הכול
        </button>
        {ESSENTIAL_NUMBER_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.categoryChip} ${filters.category === option ? styles.categoryChipActive : ""}`}
            aria-pressed={filters.category === option}
            onClick={() => selectCategory(option)}
          >
            {ESSENTIAL_NUMBER_CATEGORY_LABEL[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

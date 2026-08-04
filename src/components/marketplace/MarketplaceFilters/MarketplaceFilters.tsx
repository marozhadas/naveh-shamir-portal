import { useId } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { getVisibleMarketplaceCategories } from "@/data/marketplace-categories";
import { MARKETPLACE_SORT_LABEL, MARKETPLACE_SORT_OPTIONS, PRICE_RANGE_LABEL, PRICE_RANGE_OPTIONS } from "@/types/marketplace-filters";
import type { MarketplaceFilters as MarketplaceFiltersType } from "@/types/marketplace-filters";
import styles from "./MarketplaceFilters.module.css";

const CATEGORIES = getVisibleMarketplaceCategories();

const TYPE_OPTIONS: Array<{ value: MarketplaceFiltersType["listingType"]; label: string }> = [
  { value: "", label: "הכל" },
  { value: "giveaway", label: "מסירה" },
  { value: "sale", label: "מכירה" },
];

type MarketplaceFiltersProps = {
  searchDraft: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  filters: MarketplaceFiltersType;
  onChange: (filters: MarketplaceFiltersType) => void;
};

export function MarketplaceFilters({ searchDraft, onSearchChange, onClearSearch, filters, onChange }: MarketplaceFiltersProps) {
  const searchId = useId();
  const categoryId = useId();
  const priceId = useId();
  const sortId = useId();

  return (
    <div className={styles.wrap}>
      <SearchBar
        id={searchId}
        label="חיפוש מודעות בלוח מסירה ומכירה"
        placeholder="חיפוש לפי שם, תיאור או קטגוריה..."
        value={searchDraft}
        onChange={(event) => onSearchChange(event.target.value)}
        onClear={onClearSearch}
      />

      <div className={styles.typeGroup} role="group" aria-label="סוג פרסום">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value || "all"}
            type="button"
            className={`${styles.typeButton} ${filters.listingType === option.value ? styles.typeButtonActive : ""}`}
            aria-pressed={filters.listingType === option.value}
            onClick={() => onChange({ ...filters, listingType: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={styles.selectField}>
        <label htmlFor={categoryId}>קטגוריה</label>
        <select id={categoryId} value={filters.categoryId} onChange={(event) => onChange({ ...filters, categoryId: event.target.value })}>
          <option value="">כל הקטגוריות</option>
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.selectField}>
        <label htmlFor={priceId}>טווח מחיר</label>
        <select id={priceId} value={filters.priceRange} onChange={(event) => onChange({ ...filters, priceRange: event.target.value as MarketplaceFiltersType["priceRange"] })}>
          {PRICE_RANGE_OPTIONS.map((option) => (
            <option key={option || "all"} value={option}>
              {PRICE_RANGE_LABEL[option]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.selectField}>
        <label htmlFor={sortId}>מיון</label>
        <select id={sortId} value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as MarketplaceFiltersType["sort"] })}>
          {MARKETPLACE_SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {MARKETPLACE_SORT_LABEL[option]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

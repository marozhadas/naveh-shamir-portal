import { useId } from "react";
import { X } from "lucide-react";
import { SearchBar } from "@/components/ui/SearchBar";
import { WHATSAPP_GROUP_CATEGORY_LABEL, WHATSAPP_GROUP_CATEGORY_OPTIONS } from "@/types/whatsapp-group";
import { DEFAULT_WHATSAPP_GROUP_FILTERS } from "@/types/whatsapp-group-filters";
import type { WhatsAppGroupFilters } from "@/types/whatsapp-group-filters";
import type { WhatsAppGroupCategory } from "@/types/whatsapp-group";
import styles from "./WhatsAppGroupsFilters.module.css";

type WhatsAppGroupsFiltersProps = {
  searchDraft: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  filters: WhatsAppGroupFilters;
  onChange: (filters: WhatsAppGroupFilters) => void;
  /** Derived from the currently-loaded published groups, not a fixed list — empty when no group carries an audience tag. */
  audienceOptions: string[];
};

export function WhatsAppGroupsFilters({ searchDraft, onSearchChange, onClearSearch, filters, onChange, audienceOptions }: WhatsAppGroupsFiltersProps) {
  const searchId = useId();
  const audienceId = useId();
  const isDefault = !searchDraft.trim() && !filters.category && !filters.audience;

  function selectCategory(category: WhatsAppGroupCategory | "") {
    onChange({ ...filters, category });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SearchBar
          id={searchId}
          label="חיפוש קבוצת WhatsApp"
          placeholder="חיפוש קבוצת WhatsApp"
          value={searchDraft}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onClearSearch}
        />

        {audienceOptions.length > 0 && (
          <div className={styles.audienceField}>
            <label htmlFor={audienceId} className={styles.audienceLabel}>
              סינון לפי קהל
            </label>
            <select id={audienceId} className={styles.audienceSelect} value={filters.audience} onChange={(event) => onChange({ ...filters, audience: event.target.value })}>
              <option value="">כל הקהלים</option>
              {audienceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isDefault && (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              onClearSearch();
              onChange({ ...DEFAULT_WHATSAPP_GROUP_FILTERS });
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
        {WHATSAPP_GROUP_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.categoryChip} ${filters.category === option ? styles.categoryChipActive : ""}`}
            aria-pressed={filters.category === option}
            onClick={() => selectCategory(option)}
          >
            {WHATSAPP_GROUP_CATEGORY_LABEL[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

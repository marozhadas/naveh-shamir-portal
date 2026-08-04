import { useId } from "react";
import { X } from "lucide-react";
import { SearchBar } from "@/components/ui/SearchBar";
import { EVENT_AUDIENCE_LABEL, EVENT_AUDIENCE_OPTIONS } from "@/types/community-event";
import { EVENT_DATE_FILTER_LABEL, EVENT_DATE_FILTER_OPTIONS, DEFAULT_EVENT_FILTERS } from "@/types/community-event-filters";
import type { CommunityEventFilters } from "@/types/community-event-filters";
import type { EventAudience } from "@/types/community-event";
import styles from "./EventsFilters.module.css";

type EventsFiltersProps = {
  searchDraft: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  filters: CommunityEventFilters;
  onChange: (filters: CommunityEventFilters) => void;
};

export function EventsFilters({ searchDraft, onSearchChange, onClearSearch, filters, onChange }: EventsFiltersProps) {
  const searchId = useId();
  const dateId = useId();
  const customDateId = useId();

  function toggleAudience(value: EventAudience) {
    const next = filters.audience.includes(value) ? filters.audience.filter((a) => a !== value) : [...filters.audience, value];
    onChange({ ...filters, audience: next });
  }

  const isDefault =
    !searchDraft.trim() && filters.audience.length === 0 && filters.dateFilter === DEFAULT_EVENT_FILTERS.dateFilter && !filters.price;

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SearchBar
          id={searchId}
          label="חיפוש אירועים בנווה שמיר"
          placeholder="חיפוש לפי שם, תיאור או מיקום..."
          value={searchDraft}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onClearSearch}
        />

        <div className={styles.dateField}>
          <label htmlFor={dateId}>תאריך</label>
          <select id={dateId} value={filters.dateFilter} onChange={(e) => onChange({ ...filters, dateFilter: e.target.value as CommunityEventFilters["dateFilter"] })}>
            {EVENT_DATE_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {EVENT_DATE_FILTER_LABEL[option]}
              </option>
            ))}
          </select>
        </div>

        {filters.dateFilter === "custom" && (
          <div className={styles.dateField}>
            <label htmlFor={customDateId}>בחירת תאריך</label>
            <input id={customDateId} type="date" value={filters.customDate} onChange={(e) => onChange({ ...filters, customDate: e.target.value })} />
          </div>
        )}

        <div className={styles.priceGroup} role="group" aria-label="חינם או בתשלום">
          {(["", "free", "paid"] as const).map((option) => (
            <button
              key={option || "all"}
              type="button"
              className={`${styles.priceButton} ${filters.price === option ? styles.priceButtonActive : ""}`}
              aria-pressed={filters.price === option}
              onClick={() => onChange({ ...filters, price: option })}
            >
              {option === "" ? "הכל" : option === "free" ? "חינם" : "בתשלום"}
            </button>
          ))}
        </div>

        {!isDefault && (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              onClearSearch();
              onChange({ ...DEFAULT_EVENT_FILTERS });
            }}
          >
            <X size={14} aria-hidden="true" />
            איפוס סינון
          </button>
        )}
      </div>

      <div className={styles.audienceRow} role="group" aria-label="קהל יעד">
        <button type="button" className={`${styles.audienceChip} ${filters.audience.length === 0 ? styles.audienceChipActive : ""}`} aria-pressed={filters.audience.length === 0} onClick={() => onChange({ ...filters, audience: [] })}>
          הכול
        </button>
        {EVENT_AUDIENCE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.audienceChip} ${filters.audience.includes(option) ? styles.audienceChipActive : ""}`}
            aria-pressed={filters.audience.includes(option)}
            onClick={() => toggleAudience(option)}
          >
            {EVENT_AUDIENCE_LABEL[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

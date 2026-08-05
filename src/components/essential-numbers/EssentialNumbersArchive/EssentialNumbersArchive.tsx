"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Siren } from "lucide-react";
import { EssentialNumbersFilters } from "@/components/essential-numbers/EssentialNumbersFilters/EssentialNumbersFilters";
import { EssentialNumberCard } from "@/components/essential-numbers/EssentialNumberCard/EssentialNumberCard";
import { EssentialNumbersEmptyState } from "@/components/essential-numbers/EssentialNumbersEmptyState/EssentialNumbersEmptyState";
import { useEssentialNumberSearchParams } from "@/hooks/use-essential-number-search-params";
import { filterEssentialNumbers, sortEssentialNumbers } from "@/utils/essential-number-filters";
import { DEFAULT_ESSENTIAL_NUMBER_FILTERS } from "@/types/essential-number-filters";
import { trackAnalyticsEvent } from "@/repositories/analytics-service";
import type { EssentialNumberRow } from "@/types/essential-number";
import type { EssentialNumberFilters } from "@/types/essential-number-filters";
import styles from "./EssentialNumbersArchive.module.css";

const SEARCH_DEBOUNCE_MS = 300;

type EssentialNumbersArchiveProps = {
  entries: EssentialNumberRow[];
};

export function EssentialNumbersArchive({ entries }: EssentialNumbersArchiveProps) {
  const { filters, setFilters } = useEssentialNumberSearchParams();
  const [searchDraft, setSearchDraft] = useState(filters.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastQuery, setLastQuery] = useState(filters.query);
  if (filters.query !== lastQuery) {
    setLastQuery(filters.query);
    setSearchDraft(filters.query);
  }

  const filteredSorted = useMemo(() => sortEssentialNumbers(filterEssentialNumbers(entries, filters)), [entries, filters]);

  useEffect(() => {
    if (!filters.query.trim()) return;
    void trackAnalyticsEvent("essential-number-search", { metadata: { query: filters.query.trim(), resultsCount: filteredSorted.length } });
    // Only re-fire when the committed query itself changes, not on every keystroke/render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query]);

  function commitQuery(nextQuery: string) {
    setFilters({ ...filters, query: nextQuery });
  }

  function handleSearchChange(nextValue: string) {
    setSearchDraft(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitQuery(nextValue), SEARCH_DEBOUNCE_MS);
  }

  function handleClearSearch() {
    setSearchDraft("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commitQuery("");
  }

  function clearAllFilters() {
    setSearchDraft("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters({ ...DEFAULT_ESSENTIAL_NUMBER_FILTERS });
  }

  function handleFiltersChange(next: EssentialNumberFilters) {
    if (next.category !== filters.category) {
      void trackAnalyticsEvent("essential-number-filter", { category: next.category || null });
    }
    setFilters(next);
  }

  const hasActiveFilters = Boolean(filters.query.trim()) || Boolean(filters.category);

  const emergencyEntries = filteredSorted.filter((entry) => entry.category === "emergency");
  const otherEntries = filteredSorted.filter((entry) => entry.category !== "emergency");
  // Only split into a separate "במקרה חירום" section when the category filter isn't already
  // isolating emergency numbers on their own — otherwise the whole grid would just duplicate.
  const showSeparateEmergencySection = emergencyEntries.length > 0 && filters.category !== "emergency";

  return (
    <div>
      <EssentialNumbersFilters searchDraft={searchDraft} onSearchChange={handleSearchChange} onClearSearch={handleClearSearch} filters={filters} onChange={handleFiltersChange} />

      {filteredSorted.length === 0 ? (
        <EssentialNumbersEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearAllFilters} />
      ) : (
        <>
          {showSeparateEmergencySection && (
            <section className={styles.emergencySection} aria-labelledby="emergency-heading">
              <h2 id="emergency-heading" className={styles.emergencyTitle}>
                <Siren size={20} aria-hidden="true" />
                במקרה חירום
              </h2>
              <div className={styles.grid}>
                {emergencyEntries.map((entry) => (
                  <EssentialNumberCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}

          <p className={styles.resultsCount}>{`מוצגים ${filteredSorted.length} מספרים`}</p>
          <div className={styles.grid}>
            {(showSeparateEmergencySection ? otherEntries : filteredSorted).map((entry) => (
              <EssentialNumberCard key={entry.id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

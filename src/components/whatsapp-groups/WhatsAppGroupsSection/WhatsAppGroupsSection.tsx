"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { WhatsAppGroupsFilters } from "@/components/whatsapp-groups/WhatsAppGroupsFilters/WhatsAppGroupsFilters";
import { WhatsAppGroupCard } from "@/components/whatsapp-groups/WhatsAppGroupCard/WhatsAppGroupCard";
import { WhatsAppGroupsEmptyState } from "@/components/whatsapp-groups/WhatsAppGroupsEmptyState/WhatsAppGroupsEmptyState";
import { useWhatsAppGroupSearchParams } from "@/hooks/use-whatsapp-group-search-params";
import { collectDistinctAudiences, filterWhatsAppGroups, sortWhatsAppGroups } from "@/utils/whatsapp-group-filters";
import { DEFAULT_WHATSAPP_GROUP_FILTERS } from "@/types/whatsapp-group-filters";
import { trackAnalyticsEvent } from "@/repositories/analytics-service";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";
import type { WhatsAppGroupFilters } from "@/types/whatsapp-group-filters";
import styles from "./WhatsAppGroupsSection.module.css";

const SEARCH_DEBOUNCE_MS = 300;

type WhatsAppGroupsSectionProps = {
  groups: WhatsAppGroupRow[];
};

export function WhatsAppGroupsSection({ groups }: WhatsAppGroupsSectionProps) {
  const { filters, setFilters } = useWhatsAppGroupSearchParams();
  const [searchDraft, setSearchDraft] = useState(filters.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastQuery, setLastQuery] = useState(filters.query);
  if (filters.query !== lastQuery) {
    setLastQuery(filters.query);
    setSearchDraft(filters.query);
  }

  const audienceOptions = useMemo(() => collectDistinctAudiences(groups), [groups]);
  const filteredSorted = useMemo(() => sortWhatsAppGroups(filterWhatsAppGroups(groups, filters)), [groups, filters]);

  useEffect(() => {
    if (!filters.query.trim()) return;
    void trackAnalyticsEvent("whatsapp-group-search", { metadata: { query: filters.query.trim(), resultsCount: filteredSorted.length } });
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
    setFilters({ ...DEFAULT_WHATSAPP_GROUP_FILTERS });
  }

  function handleFiltersChange(next: WhatsAppGroupFilters) {
    if (next.category !== filters.category || next.audience !== filters.audience) {
      void trackAnalyticsEvent("whatsapp-group-filter", { category: next.category || null, metadata: { audience: next.audience || null } });
    }
    setFilters(next);
  }

  const hasActiveFilters = Boolean(filters.query.trim()) || Boolean(filters.category) || Boolean(filters.audience);

  const featuredEntries = filteredSorted.filter((entry) => entry.featured);
  const otherEntries = filteredSorted.filter((entry) => !entry.featured);
  const showFeaturedSection = featuredEntries.length > 0 && otherEntries.length > 0;

  return (
    <div>
      <WhatsAppGroupsFilters
        searchDraft={searchDraft}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        filters={filters}
        onChange={handleFiltersChange}
        audienceOptions={audienceOptions}
      />

      {filteredSorted.length === 0 ? (
        <WhatsAppGroupsEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearAllFilters} />
      ) : (
        <>
          {showFeaturedSection && (
            <section className={styles.featuredSection} aria-labelledby="whatsapp-groups-featured-heading">
              <h3 id="whatsapp-groups-featured-heading" className={styles.featuredTitle}>
                <Sparkles size={18} aria-hidden="true" />
                קבוצות מומלצות
              </h3>
              <div className={styles.grid}>
                {featuredEntries.map((group) => (
                  <WhatsAppGroupCard key={group.id} group={group} />
                ))}
              </div>
            </section>
          )}

          <p className={styles.resultsCount}>{`מוצגות ${filteredSorted.length} קבוצות`}</p>
          <div className={styles.grid}>
            {(showFeaturedSection ? otherEntries : filteredSorted).map((group) => (
              <WhatsAppGroupCard key={group.id} group={group} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

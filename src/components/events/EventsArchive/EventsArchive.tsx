"use client";

import { useMemo, useRef, useState } from "react";
import { EventsFilters } from "@/components/events/EventsFilters/EventsFilters";
import { EventListCard } from "@/components/events/EventListCard/EventListCard";
import { EventsEmptyState } from "@/components/events/EventsEmptyState/EventsEmptyState";
import { useCommunityEventSearchParams } from "@/hooks/use-community-event-search-params";
import { filterCommunityEvents, sortCommunityEventsByDate } from "@/utils/community-event-filters";
import { DEFAULT_EVENT_FILTERS } from "@/types/community-event-filters";
import type { CommunityEventRow } from "@/types/community-event";
import type { CommunityEventFilters } from "@/types/community-event-filters";
import styles from "./EventsArchive.module.css";

const SEARCH_DEBOUNCE_MS = 300;

type EventsArchiveProps = {
  events: CommunityEventRow[];
};

export function EventsArchive({ events }: EventsArchiveProps) {
  const { filters, setFilters } = useCommunityEventSearchParams();
  const [searchDraft, setSearchDraft] = useState(filters.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastQuery, setLastQuery] = useState(filters.query);
  if (filters.query !== lastQuery) {
    setLastQuery(filters.query);
    setSearchDraft(filters.query);
  }

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
    setFilters({ ...DEFAULT_EVENT_FILTERS });
  }

  const filteredSorted = useMemo(() => {
    const filtered = filterCommunityEvents(events, filters);
    return sortCommunityEventsByDate(filtered);
  }, [events, filters]);

  const hasActiveFilters =
    Boolean(filters.query.trim()) || filters.audience.length > 0 || filters.dateFilter !== DEFAULT_EVENT_FILTERS.dateFilter || Boolean(filters.price);

  return (
    <div>
      <EventsFilters searchDraft={searchDraft} onSearchChange={handleSearchChange} onClearSearch={handleClearSearch} filters={filters} onChange={(next: CommunityEventFilters) => setFilters(next)} />

      {filteredSorted.length === 0 ? (
        <EventsEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearAllFilters} />
      ) : (
        <>
          <p className={styles.resultsCount}>{`מוצגים ${filteredSorted.length} אירועים`}</p>
          <div className={styles.grid}>
            {filteredSorted.map((event) => (
              <EventListCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

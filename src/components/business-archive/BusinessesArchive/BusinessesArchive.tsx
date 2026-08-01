"use client";

import { useMemo, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { SearchBar } from "@/components/ui/SearchBar";
import { SortSelect } from "@/components/business-archive/SortSelect/SortSelect";
import { BusinessesSidebar } from "@/components/business-archive/BusinessesSidebar/BusinessesSidebar";
import { MobileFiltersSheet } from "@/components/business-archive/MobileFiltersSheet/MobileFiltersSheet";
import { ActiveFilterChips } from "@/components/business-archive/ActiveFilterChips/ActiveFilterChips";
import { BusinessesGrid } from "@/components/business-archive/BusinessesGrid/BusinessesGrid";
import { ResultsCount } from "@/components/business-archive/ResultsCount/ResultsCount";
import { LoadMoreButton } from "@/components/business-archive/LoadMoreButton/LoadMoreButton";
import { BusinessesEmptyState } from "@/components/business-archive/BusinessesEmptyState/BusinessesEmptyState";
import { useBusinessSearchParams } from "@/hooks/use-business-search-params";
import { filterBusinesses, getCategoryCounts, sortBusinesses } from "@/utils/business-filters";
import { ALL_BUSINESSES } from "@/data/all-businesses";
import type { Business } from "@/types/business";
import type { BusinessFilters } from "@/types/business-filters";
import styles from "./BusinessesArchive.module.css";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

type BusinessesArchiveProps = {
  /** Defaults to the static demo list when omitted (e.g. in isolated stories/tests). The real page always passes the repository-resolved list, which also includes any admin-approved Supabase registrations. */
  businesses?: Business[];
};

export function BusinessesArchive({ businesses = ALL_BUSINESSES }: BusinessesArchiveProps) {
  const { filters, setFilters } = useBusinessSearchParams();
  const [searchDraft, setSearchDraft] = useState(filters.query);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the search draft in sync with the URL when it changes from outside typing
  // (Back/Forward, a chip removal, "clear all") — adjust-during-render, not an effect.
  const [lastQuery, setLastQuery] = useState(filters.query);
  if (filters.query !== lastQuery) {
    setLastQuery(filters.query);
    setSearchDraft(filters.query);
  }

  // Pagination resets whenever the active filters actually change (new URL state), not on
  // every render — `filters` is referentially stable per URL via useBusinessSearchParams.
  const [lastFilters, setLastFilters] = useState<BusinessFilters>(filters);
  if (filters !== lastFilters) {
    setLastFilters(filters);
    setVisibleCount(PAGE_SIZE);
  }

  function commitQuery(nextQuery: string) {
    setFilters({ ...filters, query: nextQuery });
  }

  function handleSearchInput(nextValue: string) {
    setSearchDraft(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitQuery(nextValue), SEARCH_DEBOUNCE_MS);
  }

  function handleClearSearch() {
    setSearchDraft("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commitQuery("");
  }

  function updateCategoryIds(categoryIds: string[]) {
    setFilters({ ...filters, categoryIds });
  }

  function removeCategory(categoryId: string) {
    setFilters({ ...filters, categoryIds: filters.categoryIds.filter((id) => id !== categoryId) });
  }

  function clearAll() {
    setSearchDraft("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters({ query: "", categoryIds: [], sort: filters.sort });
  }

  // Visible + query-matched, but not yet category-filtered — the base both the sidebar's
  // "הכל" count and the mobile sheet's live preview count are computed from.
  const queryFilteredBusinesses = useMemo(
    () => filterBusinesses(businesses, { query: filters.query, categoryIds: [], sort: filters.sort }),
    [businesses, filters.query, filters.sort],
  );

  const categoryCounts = useMemo(() => getCategoryCounts(businesses, filters.query), [businesses, filters.query]);

  const filteredSorted = useMemo(() => {
    const filtered = filterBusinesses(businesses, filters);
    return sortBusinesses(filtered, filters.sort);
  }, [businesses, filters]);

  const visibleBusinesses = filteredSorted.slice(0, visibleCount);
  const activeCategoryCount = filters.categoryIds.length;

  return (
    <div className={styles.layout}>
      <div className={styles.toolbar}>
        <SearchBar
          id="businesses-search"
          label="חיפוש לפי שם עסק, שירות או תחום"
          placeholder="חיפוש לפי שם עסק, שירות או תחום"
          value={searchDraft}
          onChange={(event) => handleSearchInput(event.target.value)}
          onClear={handleClearSearch}
        />
        <div className={styles.toolbarRight}>
          <button
            type="button"
            className={styles.mobileFilterButton}
            onClick={() => setMobileFiltersOpen(true)}
          >
            <Filter size={16} aria-hidden="true" />
            סינון
            {activeCategoryCount > 0 && <span className={styles.badge}>{activeCategoryCount}</span>}
          </button>
          <SortSelect value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })} />
        </div>
      </div>

      <ActiveFilterChips
        filters={filters}
        onRemoveCategory={removeCategory}
        onClearQuery={handleClearSearch}
        onClearAll={clearAll}
      />

      <div className={styles.contentLayout}>
        <BusinessesSidebar
          selectedCategoryIds={filters.categoryIds}
          onChange={updateCategoryIds}
          counts={categoryCounts}
          totalCount={queryFilteredBusinesses.length}
        />

        <div className={styles.main}>
          <ResultsCount count={filteredSorted.length} />

          {filteredSorted.length === 0 ? (
            <BusinessesEmptyState onClearFilters={clearAll} />
          ) : (
            <>
              <BusinessesGrid businesses={visibleBusinesses} />
              <LoadMoreButton
                visibleCount={visibleBusinesses.length}
                totalCount={filteredSorted.length}
                onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
              />
            </>
          )}
        </div>
      </div>

      <MobileFiltersSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        selectedCategoryIds={filters.categoryIds}
        onApply={updateCategoryIds}
        counts={categoryCounts}
        totalCount={queryFilteredBusinesses.length}
        queryFilteredBusinesses={queryFilteredBusinesses}
      />
    </div>
  );
}

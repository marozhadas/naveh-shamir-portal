"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters/MarketplaceFilters";
import { MarketplaceListingCard } from "@/components/marketplace/MarketplaceListingCard/MarketplaceListingCard";
import { MarketplaceEmptyState } from "@/components/marketplace/MarketplaceEmptyState/MarketplaceEmptyState";
import { useMarketplaceSearchParams } from "@/hooks/use-marketplace-search-params";
import { filterMarketplaceListings, sortMarketplaceListings } from "@/utils/marketplace-filters";
import type { MarketplaceListingRow } from "@/types/marketplace";
import type { MarketplaceFilters as MarketplaceFiltersType } from "@/types/marketplace-filters";
import styles from "./MarketplaceArchive.module.css";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

type MarketplaceArchiveProps = {
  listings: MarketplaceListingRow[];
};

export function MarketplaceArchive({ listings }: MarketplaceArchiveProps) {
  const { filters, setFilters } = useMarketplaceSearchParams();
  const [searchDraft, setSearchDraft] = useState(filters.query);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastQuery, setLastQuery] = useState(filters.query);
  if (filters.query !== lastQuery) {
    setLastQuery(filters.query);
    setSearchDraft(filters.query);
  }

  const [lastFilters, setLastFilters] = useState<MarketplaceFiltersType>(filters);
  if (filters !== lastFilters) {
    setLastFilters(filters);
    setVisibleCount(PAGE_SIZE);
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
    setFilters({ query: "", listingType: "", categoryId: "", priceRange: "", sort: filters.sort });
  }

  const filteredSorted = useMemo(() => {
    const filtered = filterMarketplaceListings(listings, filters);
    return sortMarketplaceListings(filtered, filters.sort);
  }, [listings, filters]);

  const visibleListings = filteredSorted.slice(0, visibleCount);
  const hasResults = visibleListings.length > 0;

  return (
    <div>
      <MarketplaceFilters
        searchDraft={searchDraft}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        filters={filters}
        onChange={setFilters}
      />

      {!hasResults ? (
        <MarketplaceEmptyState onClearFilters={clearAllFilters} />
      ) : (
        <>
          <p className={styles.resultsCount}>{`מוצגות ${filteredSorted.length} מודעות`}</p>
          <div className={styles.grid}>
            {visibleListings.map((listing) => (
              <MarketplaceListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {visibleCount < filteredSorted.length && (
            <div className={styles.loadMoreWrap}>
              <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                טעינת מודעות נוספות
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

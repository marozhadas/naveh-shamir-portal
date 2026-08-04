"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseMarketplaceSearchParams, serializeMarketplaceFilters } from "@/utils/marketplace-search-params";
import type { MarketplaceFilters } from "@/types/marketplace-filters";

/** The URL is the single source of truth for MarketplaceFilters — mirrors use-business-search-params.ts. */
export function useMarketplaceSearchParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = useMemo(() => parseMarketplaceSearchParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: MarketplaceFilters) => {
      const queryString = serializeMarketplaceFilters(next).toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return { filters, setFilters };
}

"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseBusinessSearchParams, serializeBusinessFilters } from "@/utils/business-search-params";
import type { BusinessFilters } from "@/types/business-filters";

/**
 * The URL is the single source of truth for BusinessFilters (spec section 27) — this hook is
 * the only place that reads or writes it. `useSearchParams()` re-renders on browser Back/Forward
 * too, so filters parsed from it always reflect the current URL, not just our own pushes.
 */
export function useBusinessSearchParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = useMemo(() => parseBusinessSearchParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: BusinessFilters) => {
      const queryString = serializeBusinessFilters(next).toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return { filters, setFilters };
}

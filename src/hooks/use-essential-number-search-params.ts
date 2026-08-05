"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseEssentialNumberSearchParams, serializeEssentialNumberFilters } from "@/types/essential-number-filters";
import type { EssentialNumberFilters } from "@/types/essential-number-filters";

/** The URL is the single source of truth for EssentialNumberFilters — mirrors use-community-event-search-params.ts. */
export function useEssentialNumberSearchParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = useMemo(() => parseEssentialNumberSearchParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: EssentialNumberFilters) => {
      const queryString = serializeEssentialNumberFilters(next).toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return { filters, setFilters };
}

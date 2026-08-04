"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseCommunityEventSearchParams, serializeCommunityEventFilters } from "@/types/community-event-filters";
import type { CommunityEventFilters } from "@/types/community-event-filters";

/** The URL is the single source of truth for CommunityEventFilters — mirrors use-marketplace-search-params.ts. */
export function useCommunityEventSearchParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = useMemo(() => parseCommunityEventSearchParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: CommunityEventFilters) => {
      const queryString = serializeCommunityEventFilters(next).toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return { filters, setFilters };
}

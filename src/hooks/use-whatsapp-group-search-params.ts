"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseWhatsAppGroupSearchParams, serializeWhatsAppGroupFilters } from "@/types/whatsapp-group-filters";
import type { WhatsAppGroupFilters } from "@/types/whatsapp-group-filters";

/** The URL is the single source of truth for WhatsAppGroupFilters — mirrors use-essential-number-search-params.ts, with distinct wa*-prefixed params since both filter UIs share the /essential-numbers URL. */
export function useWhatsAppGroupSearchParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = useMemo(() => parseWhatsAppGroupSearchParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: WhatsAppGroupFilters) => {
      const queryString = serializeWhatsAppGroupFilters(next, searchParams).toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { filters, setFilters };
}

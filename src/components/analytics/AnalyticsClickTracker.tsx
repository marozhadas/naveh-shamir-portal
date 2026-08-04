"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/repositories/analytics-service";
import type { AnalyticsEventName } from "@/types/analytics";

const TRACKED_EVENT_NAMES: AnalyticsEventName[] = ["business_phone_click", "business_whatsapp_click"];

/**
 * One delegated click listener, mounted once in the root layout, instead of converting every
 * button's server component into a client component. Any element (or ancestor) carrying
 * data-analytics-event="<name>" — plus optional data-analytics-business-id/data-analytics-category
 * — gets tracked on click, fire-and-forget, without blocking the tel:/wa.me navigation.
 */
export function AnalyticsClickTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-analytics-event]");
      if (!el) return;

      const eventName = el.dataset.analyticsEvent as AnalyticsEventName | undefined;
      if (!eventName || !TRACKED_EVENT_NAMES.includes(eventName)) return;

      void trackAnalyticsEvent(eventName, {
        businessId: el.dataset.analyticsBusinessId ?? null,
        category: el.dataset.analyticsCategory ?? null,
      });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}

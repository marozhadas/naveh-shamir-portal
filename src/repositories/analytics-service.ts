"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { isSupabaseBusinessId, toRegistrationId } from "@/utils/business-id";
import type { AnalyticsEventName } from "@/types/analytics";

type TrackAnalyticsEventInput = {
  businessId?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * business_analytics_events.business_id is a real FK to business_registrations.id — a raw uuid.
 * Every caller of trackAnalyticsEvent passes Business.id, which for a real business is always
 * "reg-<uuid>" (see business-id.ts) — inserting that string directly has always violated the FK
 * silently (caught below, logged, never surfaced) so no business_page_view/phone/whatsapp event
 * has ever actually been recorded. This is the one place that translates back to the raw uuid.
 * A demo/mock business id (e.g. "d1") isn't a real registration either, so it becomes null too —
 * there's nothing real to attribute the event to.
 */
function toRawBusinessId(businessId: string | null | undefined): string | null {
  if (!businessId) return null;
  return isSupabaseBusinessId(businessId) ? toRegistrationId(businessId) : null;
}

/**
 * Fire-and-forget by design — never throws, never blocks the visitor's click/navigation.
 * No IP, user-agent, or session identifier is ever collected (privacy requirement) — only the
 * event name, the business it relates to (if any), its category, and small non-personal metadata
 * (e.g. a search query string).
 */
export async function trackAnalyticsEvent(eventName: AnalyticsEventName, input: TrackAnalyticsEventInput = {}): Promise<void> {
  try {
    const supabase = createPublicSupabaseClient();
    await supabase.from("business_analytics_events").insert({
      event_name: eventName,
      business_id: toRawBusinessId(input.businessId),
      category: input.category ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error("[trackAnalyticsEvent] failed:", error);
  }
}

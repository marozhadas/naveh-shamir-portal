"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { isSupabaseBusinessId, toRegistrationId } from "@/utils/business-id";
import { buildTrendBuckets, countTimestampsInBuckets, getWindowStart } from "@/utils/business-analytics-window";
import type { AnalyticsEventName } from "@/types/analytics";
import type { BusinessAnalyticsWindow } from "@/utils/business-analytics-window";

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

export type BusinessEngagementSummary = {
  businessId: string;
  businessName: string;
  views: number;
  phoneClicks: number;
  whatsappClicks: number;
};

export type AnalyticsSummary = {
  totalViews: number;
  totalPhoneClicks: number;
  totalWhatsappClicks: number;
  totalSearches: number;
  topBusinesses: BusinessEngagementSummary[];
  topCategories: { category: string; views: number }[];
  topSearches: { query: string; count: number }[];
};

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalViews: 0,
  totalPhoneClicks: 0,
  totalWhatsappClicks: 0,
  totalSearches: 0,
  topBusinesses: [],
  topCategories: [],
  topSearches: [],
};

/** Admin-only aggregate read — the counting/grouping happens here in application code (simple, no DB views) since this is a low-traffic launch, not a data warehouse. */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  if (!isSupabaseAdminConfigured()) return EMPTY_SUMMARY;

  const admin = createAdminSupabaseClient();
  const { data: events, error } = await admin
    .from("business_analytics_events")
    .select("event_name, business_id, category, metadata")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error || !events) {
    console.error("[getAnalyticsSummary] failed:", error?.message);
    return EMPTY_SUMMARY;
  }

  const viewsByBusiness = new Map<string, number>();
  const phoneByBusiness = new Map<string, number>();
  const whatsappByBusiness = new Map<string, number>();
  const viewsByCategory = new Map<string, number>();
  const searchCounts = new Map<string, number>();
  let totalViews = 0;
  let totalPhoneClicks = 0;
  let totalWhatsappClicks = 0;
  let totalSearches = 0;

  for (const event of events) {
    if (event.event_name === "business_page_view") {
      totalViews++;
      if (event.business_id) viewsByBusiness.set(event.business_id, (viewsByBusiness.get(event.business_id) ?? 0) + 1);
      if (event.category) viewsByCategory.set(event.category, (viewsByCategory.get(event.category) ?? 0) + 1);
    } else if (event.event_name === "business_phone_click") {
      totalPhoneClicks++;
      if (event.business_id) phoneByBusiness.set(event.business_id, (phoneByBusiness.get(event.business_id) ?? 0) + 1);
    } else if (event.event_name === "business_whatsapp_click") {
      totalWhatsappClicks++;
      if (event.business_id) whatsappByBusiness.set(event.business_id, (whatsappByBusiness.get(event.business_id) ?? 0) + 1);
    } else if (event.event_name === "portal_search") {
      totalSearches++;
      const query = typeof event.metadata?.query === "string" ? event.metadata.query.trim() : "";
      if (query) searchCounts.set(query, (searchCounts.get(query) ?? 0) + 1);
    }
  }

  const businessIds = new Set([...viewsByBusiness.keys(), ...phoneByBusiness.keys(), ...whatsappByBusiness.keys()]);
  let namesByBusinessId = new Map<string, string>();
  if (businessIds.size > 0) {
    const { data: registrations } = await admin
      .from("business_registrations")
      .select("id, business_name")
      .in("id", Array.from(businessIds));
    namesByBusinessId = new Map((registrations ?? []).map((r) => [r.id, r.business_name]));
  }

  const topBusinesses: BusinessEngagementSummary[] = Array.from(businessIds)
    .map((businessId) => ({
      businessId,
      businessName: namesByBusinessId.get(businessId) ?? "(עסק לא ידוע)",
      views: viewsByBusiness.get(businessId) ?? 0,
      phoneClicks: phoneByBusiness.get(businessId) ?? 0,
      whatsappClicks: whatsappByBusiness.get(businessId) ?? 0,
    }))
    .sort((a, b) => b.views + b.phoneClicks + b.whatsappClicks - (a.views + a.phoneClicks + a.whatsappClicks))
    .slice(0, 20);

  const topCategories = Array.from(viewsByCategory.entries())
    .map(([category, views]) => ({ category, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const topSearches = Array.from(searchCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return { totalViews, totalPhoneClicks, totalWhatsappClicks, totalSearches, topBusinesses, topCategories, topSearches };
}

export type BusinessAnalyticsSummary = {
  totalViews: number;
  totalPhoneClicks: number;
  totalWhatsappClicks: number;
  totalWebsiteClicks: number;
  totalInstagramClicks: number;
  totalFacebookClicks: number;
  /** Total engagement (views + every click type) per bucket, oldest first — see business-analytics-window.ts. */
  trend: { label: string; count: number }[];
};

const EMPTY_BUSINESS_SUMMARY: BusinessAnalyticsSummary = {
  totalViews: 0,
  totalPhoneClicks: 0,
  totalWhatsappClicks: 0,
  totalWebsiteClicks: 0,
  totalInstagramClicks: 0,
  totalFacebookClicks: 0,
  trend: [],
};

/**
 * The single owner-facing analytics read — used by /business/dashboard/analytics. `registrationId`
 * must be the RAW business_registrations.id the caller already verified belongs to the signed-in
 * owner (via resolveDashboardViewer) — this function itself does no ownership check, so it must
 * never be called with a client-supplied id. Uses the service-role client because RLS on this
 * table has no read policy at all (service-role only, like every write-heavy analytics-style table
 * in this project) — the ownership boundary here is "who is allowed to call this function with
 * which id", enforced entirely by the caller, not by RLS.
 */
export async function getBusinessAnalyticsForOwner(registrationId: string, window: BusinessAnalyticsWindow, now: Date = new Date()): Promise<BusinessAnalyticsSummary> {
  if (!isSupabaseAdminConfigured()) return EMPTY_BUSINESS_SUMMARY;

  const admin = createAdminSupabaseClient();
  const since = getWindowStart(window, now);
  const { data: events, error } = await admin
    .from("business_analytics_events")
    .select("event_name, created_at")
    .eq("business_id", registrationId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })
    .limit(20000);

  if (error || !events) {
    console.error("[getBusinessAnalyticsForOwner] failed:", error?.message);
    return EMPTY_BUSINESS_SUMMARY;
  }

  let totalViews = 0;
  let totalPhoneClicks = 0;
  let totalWhatsappClicks = 0;
  let totalWebsiteClicks = 0;
  let totalInstagramClicks = 0;
  let totalFacebookClicks = 0;

  for (const event of events) {
    if (event.event_name === "business_page_view") totalViews++;
    else if (event.event_name === "business_phone_click") totalPhoneClicks++;
    else if (event.event_name === "business_whatsapp_click") totalWhatsappClicks++;
    else if (event.event_name === "business_website_click") totalWebsiteClicks++;
    else if (event.event_name === "business_instagram_click") totalInstagramClicks++;
    else if (event.event_name === "business_facebook_click") totalFacebookClicks++;
  }

  const buckets = buildTrendBuckets(window, now);
  const counts = countTimestampsInBuckets(
    events.map((e) => e.created_at),
    buckets,
  );
  const trend = buckets.map((bucket, index) => ({ label: bucket.label, count: counts[index] }));

  return { totalViews, totalPhoneClicks, totalWhatsappClicks, totalWebsiteClicks, totalInstagramClicks, totalFacebookClicks, trend };
}

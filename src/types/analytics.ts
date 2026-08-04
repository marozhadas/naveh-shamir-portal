/** Canonical, consistent event names — extend this list before logging a new event name. */
export type AnalyticsEventName =
  | "business_page_view"
  | "business_phone_click"
  | "business_whatsapp_click"
  | "portal_search";

export type AnalyticsEventRow = {
  id: string;
  event_name: string;
  business_id: string | null;
  category: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

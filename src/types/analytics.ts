/** Canonical, consistent event names — extend this list before logging a new event name. */
export type AnalyticsEventName =
  | "business_page_view"
  | "business_phone_click"
  | "business_whatsapp_click"
  | "portal_search"
  | "essential-number-phone-click"
  | "essential-number-whatsapp-click"
  | "essential-number-website-click"
  | "essential-number-search"
  | "essential-number-filter";

export type AnalyticsEventRow = {
  id: string;
  event_name: string;
  business_id: string | null;
  category: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

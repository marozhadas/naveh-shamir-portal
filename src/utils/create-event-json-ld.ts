import type { CommunityEventRow } from "@/types/community-event";
import { getSiteOrigin } from "@/utils/site-origin";

const STATUS_SCHEMA: Record<CommunityEventRow["status"], string> = {
  draft: "https://schema.org/EventScheduled",
  published: "https://schema.org/EventScheduled",
  canceled: "https://schema.org/EventCancelled",
  archived: "https://schema.org/EventScheduled",
};

/** Never called for a draft event by the page (drafts aren't publicly resolvable at all), but the guard stays here too as a second line of defense. */
export function createEventJsonLd(event: CommunityEventRow): Record<string, unknown> | null {
  if (event.status === "draft") return null;

  const pageUrl = `${getSiteOrigin()}/events/${event.slug}`;
  const startDate = `${event.event_date}T${event.start_time}`;
  const endDate = event.end_time ? `${event.event_date}T${event.end_time}` : undefined;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.short_description,
    startDate,
    eventStatus: STATUS_SCHEMA[event.status],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.location_name,
      address: event.address || event.location_name,
    },
    url: pageUrl,
  };

  if (endDate) jsonLd.endDate = endDate;
  if (event.image_url) jsonLd.image = [event.image_url];
  if (!event.is_free) {
    jsonLd.offers = {
      "@type": "Offer",
      price: undefined,
      priceCurrency: "ILS",
      availability: "https://schema.org/InStock",
      url: event.registration_url || pageUrl,
      description: event.price_text || undefined,
    };
  }

  return jsonLd;
}

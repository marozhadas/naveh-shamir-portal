import type { CommunityEventRow } from "@/types/community-event";
import type { EventCardContentSettings } from "@/editor/schemas/events.schema";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import { formatEventDayNumber, formatEventMonthShort, formatEventTimeRange } from "./format-event-date";
import { buildGoogleCalendarUrl } from "./event-calendar-links";
import { todayInJerusalem } from "./jerusalem-date";
import { getSiteOrigin } from "./site-origin";

const MAX_TEASER_EVENTS = 4;

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Published, not-yet-past events only, featured first then soonest date/time — this decides
 * which real events (if any) the homepage teaser shows. `now` is injectable for tests.
 */
export function pickHomepageTeaserEvents(events: CommunityEventRow[], now: Date = new Date()): CommunityEventRow[] {
  const today = todayInJerusalem(now);
  return events
    .filter((event) => event.status === "published" && event.event_date >= today)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.event_date !== b.event_date) return a.event_date < b.event_date ? -1 : 1;
      if (a.start_time !== b.start_time) return a.start_time < b.start_time ? -1 : 1;
      return 0;
    })
    .slice(0, MAX_TEASER_EVENTS);
}

/**
 * Maps a real `events` table row into the shape the editor-authored `UpcomingEventsSection`
 * expects for a single card. This is a plain runtime object, not validated through
 * `eventCardContentSchema` — string fields are defensively truncated to the same limits the
 * editor enforces so a long real title/description can never visually break the card.
 */
export function mapCommunityEventToTeaserCard(event: CommunityEventRow): EventCardContentSettings {
  const pageUrl = `${getSiteOrigin()}/events/${event.slug}`;
  return {
    id: event.id,
    slug: event.slug,
    title: truncate(event.title, CONTENT_LIMITS.cardTitle),
    description: truncate(event.short_description, CONTENT_LIMITS.cardDescription),
    startDate: `${event.event_date}T${event.start_time.slice(0, 5)}`,
    endDate: event.end_time ? `${event.event_date}T${event.end_time.slice(0, 5)}` : "",
    displayDay: formatEventDayNumber(event.event_date),
    displayMonth: formatEventMonthShort(event.event_date),
    displayTime: formatEventTimeRange(event.start_time, event.end_time),
    location: truncate(event.location_name, CONTENT_LIMITS.eventLocation),
    image: { src: event.image_url ?? "", alt: truncate(event.image_alt ?? event.title, CONTENT_LIMITS.imageAlt), objectFit: "cover" },
    priceLabel: truncate(event.is_free ? "חינם" : event.price_text || "בתשלום", CONTENT_LIMITS.eventTimeLabel),
    calendarUrl: buildGoogleCalendarUrl(event, pageUrl),
    calendarButtonLabel: "הוספה ליומן",
    visible: true,
  };
}

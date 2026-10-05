"use client";

import { CommunityPulseSection } from "@/components/home/CommunityPulseSection/CommunityPulseSection";
import { defaultUpcomingEventsSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";
import { mapCommunityEventToTeaserCard } from "@/utils/map-community-events-to-teaser-cards";
import type { CommunityEventRow } from "@/types/community-event";
import { HOMEPAGE_NEWS_COUNT, type CommunityNewsRow } from "@/types/community-news";
import type { UpcomingEventsEditorSettings } from "@/editor/schemas/events.schema";

type ConnectedUpcomingEventsProps = {
  /**
   * Real, published, upcoming events (fetched server-side in page.tsx via
   * pickHomepageTeaserEvents, soonest first), the same for every visitor. Up to 3 (soonest first) are shown. When present,
   * this REPLACES the editor-authored `content.events` — the events table is the single source of
   * truth here, not the floating-editor blob. Appearance (card colors/button variant) and the
   * "show all" link/label still come from the editor as normal.
   */
  events?: CommunityEventRow[];
  /** Real, published community-news articles (fetched server-side in page.tsx), newest first. Up to HOMEPAGE_NEWS_COUNT (latest) go in the slider; /news lists all of them. */
  news?: CommunityNewsRow[];
};

const MAX_HOMEPAGE_EVENTS = 3;

function pickPlaceholderEvents(settings: UpcomingEventsEditorSettings) {
  // No real data fetched at all (events prop entirely absent) — fall back to the
  // editor-authored placeholder event, same convention as every other Connected* component.
  const byId = new Map(settings.content.events.map((event) => [event.id, event]));
  const ordered = settings.content.eventsOrder.map((id) => byId.get(id)).filter((event) => event !== undefined);
  return (ordered.length > 0 ? ordered : settings.content.events).slice(0, MAX_HOMEPAGE_EVENTS);
}

export function ConnectedUpcomingEvents({ events, news }: ConnectedUpcomingEventsProps) {
  const settings = useResolvedSectionSettings("upcomingEvents", defaultUpcomingEventsSettings);
  const eventCards =
    events !== undefined ? events.slice(0, MAX_HOMEPAGE_EVENTS).map(mapCommunityEventToTeaserCard) : pickPlaceholderEvents(settings);
  const newsItems = (news ?? []).slice(0, HOMEPAGE_NEWS_COUNT);

  return (
    <CommunityPulseSection
      events={eventCards}
      newsItems={newsItems}
      eventsHref={settings.content.showAllLinkHref}
      eventsButtonLabel={settings.content.showAllLinkLabel}
    />
  );
}

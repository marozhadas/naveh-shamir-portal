"use client";

import { CommunityPulseSection } from "@/components/home/CommunityPulseSection/CommunityPulseSection";
import { defaultUpcomingEventsSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";
import { mapCommunityEventToTeaserCard } from "@/utils/map-community-events-to-teaser-cards";
import type { CommunityEventRow } from "@/types/community-event";
import type { CommunityNewsRow } from "@/types/community-news";
import type { UpcomingEventsEditorSettings } from "@/editor/schemas/events.schema";

type ConnectedUpcomingEventsProps = {
  /**
   * Real, published, upcoming events (fetched server-side in page.tsx via
   * pickHomepageTeaserEvents, soonest first), the same for every visitor. Only the first (soonest)
   * one is shown — this section now renders a single next-event teaser, not a grid. When present,
   * this REPLACES the editor-authored `content.events` — the events table is the single source of
   * truth here, not the floating-editor blob. Appearance (card colors/button variant) and the
   * "show all" link/label still come from the editor as normal.
   */
  events?: CommunityEventRow[];
  /** Real, published community-news articles (fetched server-side in page.tsx), newest first. Only the first (latest) one is shown. */
  news?: CommunityNewsRow[];
};

function pickPlaceholderEvent(settings: UpcomingEventsEditorSettings) {
  // No real data fetched at all (events prop entirely absent) — fall back to the
  // editor-authored placeholder event, same convention as every other Connected* component.
  const firstId = settings.content.eventsOrder[0];
  return settings.content.events.find((event) => event.id === firstId) ?? settings.content.events[0] ?? null;
}

export function ConnectedUpcomingEvents({ events, news }: ConnectedUpcomingEventsProps) {
  const settings = useResolvedSectionSettings("upcomingEvents", defaultUpcomingEventsSettings);
  const nextEvent = events !== undefined ? (events.length > 0 ? mapCommunityEventToTeaserCard(events[0]) : null) : pickPlaceholderEvent(settings);
  const latestNews = news && news.length > 0 ? news[0] : null;

  return (
    <CommunityPulseSection
      nextEvent={nextEvent}
      latestNews={latestNews}
      appearance={settings.appearance}
      eventsHref={settings.content.showAllLinkHref}
      eventsButtonLabel={settings.content.showAllLinkLabel}
    />
  );
}

"use client";

import { UpcomingEventsSection } from "@/components/home/UpcomingEventsSection";
import { defaultUpcomingEventsSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";
import { mapCommunityEventToTeaserCard } from "@/utils/map-community-events-to-teaser-cards";
import type { CommunityEventRow } from "@/types/community-event";

type ConnectedUpcomingEventsProps = {
  /**
   * Real, published, upcoming events (fetched server-side in page.tsx via
   * pickHomepageTeaserEvents), the same for every visitor. When present, these REPLACE the
   * editor-authored `content.events`/`content.eventsOrder` — the events table is the single
   * source of truth here, not the floating-editor blob. Appearance/layout settings (colors,
   * columns, section title, "show all" link) still come from the editor as normal.
   */
  events?: CommunityEventRow[];
};

export function ConnectedUpcomingEvents({ events }: ConnectedUpcomingEventsProps) {
  const settings = useResolvedSectionSettings("upcomingEvents", defaultUpcomingEventsSettings);

  if (events !== undefined) {
    // No real published upcoming events yet — hide the section rather than showing
    // editor-authored placeholder/demo events on the live site (never fabricate events).
    if (events.length === 0) return null;

    const cards = events.map(mapCommunityEventToTeaserCard);
    const overriddenSettings = {
      ...settings,
      content: { ...settings.content, events: cards, eventsOrder: cards.map((card) => card.id) },
    };
    return <UpcomingEventsSection settings={overriddenSettings} />;
  }

  return <UpcomingEventsSection settings={settings} />;
}

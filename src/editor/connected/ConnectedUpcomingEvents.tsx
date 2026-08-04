"use client";

import { UpcomingEventsSection } from "@/components/home/UpcomingEventsSection";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EventsEmptyState } from "@/components/events/EventsEmptyState/EventsEmptyState";
import { defaultUpcomingEventsSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";
import { mapCommunityEventToTeaserCard } from "@/utils/map-community-events-to-teaser-cards";
import type { CommunityEventRow } from "@/types/community-event";
import sectionStyles from "@/components/home/UpcomingEventsSection/UpcomingEventsSection.module.css";

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
    // No real published upcoming events yet — the section stays visible (so the homepage always
    // shows an events area, per spec) but with an honest empty state instead of the
    // editor-authored placeholder/demo events (never fabricate events).
    if (events.length === 0) {
      return (
        <section id="events" className={sectionStyles.section} aria-labelledby="events-heading">
          {settings.content.sectionTitle && <SectionHeader id="events-heading">{settings.content.sectionTitle}</SectionHeader>}
          <EventsEmptyState hasActiveFilters={false} onClearFilters={() => {}} />
        </section>
      );
    }

    const cards = events.map(mapCommunityEventToTeaserCard);
    const overriddenSettings = {
      ...settings,
      content: { ...settings.content, events: cards, eventsOrder: cards.map((card) => card.id) },
    };
    return <UpcomingEventsSection settings={overriddenSettings} />;
  }

  return <UpcomingEventsSection settings={settings} />;
}

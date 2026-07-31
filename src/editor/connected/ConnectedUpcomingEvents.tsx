"use client";

import { UpcomingEventsSection } from "@/components/home/UpcomingEventsSection";
import { defaultUpcomingEventsSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";

export function ConnectedUpcomingEvents() {
  const settings = useResolvedSectionSettings("upcomingEvents", defaultUpcomingEventsSettings);
  return <UpcomingEventsSection settings={settings} />;
}

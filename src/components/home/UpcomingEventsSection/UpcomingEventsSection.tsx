import type { CSSProperties } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { colorTokenToCssVar, containerWidthTokenToCssValue, spacingTokenToCssVar } from "@/styles/token-to-css-variable";
import type { UpcomingEventsEditorSettings } from "@/editor/schemas/events.schema";
import { EventCard } from "./EventCard";
import styles from "./UpcomingEventsSection.module.css";

type UpcomingEventsSectionProps = {
  settings: UpcomingEventsEditorSettings;
};

export function UpcomingEventsSection({ settings }: UpcomingEventsSectionProps) {
  const orderedEvents = settings.content.eventsOrder
    .map((id) => settings.content.events.find((event) => event.id === id))
    .filter((event): event is (typeof settings.content.events)[number] => event !== undefined && event.visible)
    .slice(0, settings.content.visibleCount);

  const sectionStyle = {
    "--section-bg": colorTokenToCssVar(settings.appearance.sectionBackgroundColorToken),
    "--section-title-color": colorTokenToCssVar(settings.appearance.textColorToken),
    "--section-title-align": settings.layout.titleAlignment,
    "--section-container-max-width": containerWidthTokenToCssValue(settings.layout.containerMaxWidth),
    "--section-padding-block-start": spacingTokenToCssVar(settings.layout.sectionPaddingBlock.start),
    "--section-padding-block-end": spacingTokenToCssVar(settings.layout.sectionPaddingBlock.end),
    "--events-grid-gap": spacingTokenToCssVar(settings.layout.gap),
    "--events-columns-desktop": settings.layout.columnsDesktop,
    "--events-columns-tablet": settings.layout.columnsTablet,
    "--events-columns-mobile": settings.layout.columnsMobile,
  } as CSSProperties;

  return (
    <section id="events" className={styles.section} aria-labelledby="events-heading" style={sectionStyle}>
      {settings.content.sectionTitle && <SectionHeader id="events-heading">{settings.content.sectionTitle}</SectionHeader>}
      <div className={styles.grid}>
        {orderedEvents.map((event) => (
          <EventCard key={event.id} event={event} appearance={settings.appearance} />
        ))}
      </div>
      {settings.content.showAllLinkVisible && settings.content.showAllLinkHref && (
        <div className={styles.showAllWrap}>
          <Button href={settings.content.showAllLinkHref} variant="secondary">
            {settings.content.showAllLinkLabel}
          </Button>
        </div>
      )}
    </section>
  );
}

import type { CSSProperties } from "react";
import { CalendarPlus, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DateBadge } from "@/components/ui/DateBadge";
import { Button } from "@/components/ui/Button";
import { colorTokenToCssVar, radiusTokenToCssVar, shadowTokenToCssVar } from "@/styles/token-to-css-variable";
import type { EventCardContentSettings, UpcomingEventsEditorSettings } from "@/editor/schemas/events.schema";
import styles from "./EventCard.module.css";

type EventCardProps = {
  event: EventCardContentSettings;
  appearance: UpcomingEventsEditorSettings["appearance"];
};

export function EventCard({ event, appearance }: EventCardProps) {
  const cardStyle = {
    // Real properties (not custom-property overrides) so they reliably win over Card.module.css's
    // own hardcoded background/shadow regardless of CSS Modules stylesheet ordering.
    background: colorTokenToCssVar(appearance.cardBackgroundColorToken),
    borderRadius: radiusTokenToCssVar(appearance.cardRadiusToken),
    boxShadow: shadowTokenToCssVar(appearance.cardShadowToken),
    "--card-text-color": colorTokenToCssVar(appearance.textColorToken),
    "--date-badge-accent": colorTokenToCssVar(appearance.dateBadgeAccentColorToken),
  } as CSSProperties;

  return (
    <Card className={styles.card} style={cardStyle} data-testid="event-card">
      <div className={styles.top}>
        <DateBadge day={event.displayDay} month={event.displayMonth} />
        <div className={styles.info}>
          <h3 className={styles.title}>{event.title}</h3>
          <time dateTime={event.startDate} className="sr-only">
            {event.title} — {event.displayDay} {event.displayMonth}, {event.displayTime}
          </time>
          {event.description && <p className={styles.description}>{event.description}</p>}
          <p className={styles.meta}>
            <Clock size={14} aria-hidden="true" />
            {event.displayTime}
            {event.priceLabel && ` · ${event.priceLabel}`}
          </p>
          <p className={styles.meta}>
            <MapPin size={14} aria-hidden="true" />
            {event.location}
          </p>
        </div>
      </div>

      {event.calendarUrl && (
        <Button
          href={event.calendarUrl}
          variant={appearance.buttonVariant}
          size="compact"
          fullWidth
          download
          icon={<CalendarPlus size={15} aria-hidden="true" />}
          data-analytics-event="event-add-to-calendar-click"
        >
          {event.calendarButtonLabel}
        </Button>
      )}
    </Card>
  );
}

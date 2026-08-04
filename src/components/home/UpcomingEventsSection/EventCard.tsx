import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowLeft, CalendarPlus, Clock, ImageIcon, MapPin } from "lucide-react";
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
        <div className={styles.imageArea}>
          {event.image.src ? (
            <Image
              src={event.image.src}
              alt={event.image.alt}
              fill
              sizes="88px"
              className={styles.image}
              style={{ objectFit: event.image.objectFit }}
            />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden="true">
              <ImageIcon size={24} strokeWidth={1.5} />
            </div>
          )}
          <div className={styles.dateBadgeOverlay}>
            <DateBadge day={event.displayDay} month={event.displayMonth} />
          </div>
        </div>
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

      <div className={styles.actions}>
        {/* First in DOM = rightmost in this RTL layout, matching the requested "לפרטים נוספים
            בימין / הוספה ליומן משמאל" order. */}
        <Button href={`/events/${event.slug}`} variant="secondary" size="compact" icon={<ArrowLeft size={15} aria-hidden="true" />}>
          לפרטים נוספים
        </Button>
        {event.calendarUrl && (
          <Button
            href={event.calendarUrl}
            variant={appearance.buttonVariant}
            size="compact"
            download
            icon={<CalendarPlus size={15} aria-hidden="true" />}
            data-analytics-event="event-add-to-calendar-click"
          >
            {event.calendarButtonLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}

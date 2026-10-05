import Image from "next/image";
import { Clock, ImageIcon, MapPin } from "lucide-react";
import { DateBadge } from "@/components/ui/DateBadge";
import type { EventCardContentSettings } from "@/editor/schemas/events.schema";
import styles from "./CompactEventCard.module.css";

type CompactEventCardProps = {
  event: EventCardContentSettings;
};

/** One row in the homepage events list — the whole card links to the event page. */
export function CompactEventCard({ event }: CompactEventCardProps) {
  return (
    <a href={`/events/${event.slug}`} className={styles.card} data-testid="event-card">
      <div className={styles.imageArea}>
        {event.image.src ? (
          <Image src={event.image.src} alt="" fill sizes="76px" className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true">
            <ImageIcon size={22} strokeWidth={1.5} />
          </div>
        )}
        <div className={styles.dateBadgeOverlay}>
          <DateBadge day={event.displayDay} month={event.displayMonth} />
        </div>
      </div>
      <div className={styles.info}>
        <h4 className={styles.title}>{event.title}</h4>
        <time dateTime={event.startDate} className="sr-only">
          {event.displayDay} {event.displayMonth}, {event.displayTime}
        </time>
        <p className={styles.meta}>
          <Clock size={14} aria-hidden="true" />
          {event.displayTime}
          {event.priceLabel && ` · ${event.priceLabel}`}
        </p>
        <p className={styles.meta}>
          <MapPin size={14} aria-hidden="true" />
          <span className={styles.metaText}>{event.location}</span>
        </p>
      </div>
    </a>
  );
}

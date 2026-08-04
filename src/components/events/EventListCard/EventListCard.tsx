import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EVENT_AUDIENCE_LABEL } from "@/types/community-event";
import { formatEventDateShort, formatEventTimeRange, formatEventWeekday } from "@/utils/format-event-date";
import type { CommunityEventRow } from "@/types/community-event";
import styles from "./EventListCard.module.css";

type EventListCardProps = {
  event: CommunityEventRow;
};

export function EventListCard({ event }: EventListCardProps) {
  const href = `/events/${event.slug}`;
  const priceLabel = event.is_free ? "הכניסה חופשית" : event.price_text || "בתשלום";

  return (
    <Card noPadding className={styles.card} data-testid="event-list-card">
      <Link href={href} className={styles.imageLink} aria-label={event.title}>
        <div className={styles.imageArea}>
          {event.image_url ? (
            <Image src={event.image_url} alt={event.image_alt ?? event.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className={styles.image} />
          ) : (
            <div className={styles.placeholder} aria-hidden="true">
              <CalendarDays size={32} strokeWidth={1.5} />
            </div>
          )}
          {event.status === "canceled" && <span className={styles.canceledBadge}>האירוע בוטל</span>}
        </div>
      </Link>

      <div className={styles.body}>
        <p className={styles.dateLine}>
          {formatEventWeekday(event.event_date)}, {formatEventDateShort(event.event_date)} · {formatEventTimeRange(event.start_time, event.end_time)}
        </p>

        <h3 className={styles.title}>
          <Link href={href}>{event.title}</Link>
        </h3>

        {event.short_description && <p className={styles.description}>{event.short_description}</p>}

        <div className={styles.tags}>
          {event.audience.map((a) => (
            <span key={a} className={styles.tag}>
              {EVENT_AUDIENCE_LABEL[a]}
            </span>
          ))}
        </div>

        <p className={styles.meta}>
          <MapPin size={14} aria-hidden="true" />
          {event.location_name}
        </p>

        <p className={styles.price}>{priceLabel}</p>

        <Button href={href} variant="secondary" size="compact" icon={<ArrowLeft size={15} aria-hidden="true" />} fullWidth>
          לפרטי האירוע
        </Button>
      </div>
    </Card>
  );
}

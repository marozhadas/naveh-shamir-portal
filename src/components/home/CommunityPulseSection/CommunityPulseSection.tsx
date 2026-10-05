import { ArrowLeft, CalendarX, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { EventCardContentSettings } from "@/editor/schemas/events.schema";
import type { CommunityNewsRow } from "@/types/community-news";
import { CompactEventCard } from "./CompactEventCard";
import { NewsSlider } from "./NewsSlider";
import styles from "./CommunityPulseSection.module.css";

type CommunityPulseSectionProps = {
  /** Soonest published, not-yet-past events (already selected by the caller, up to 3) — empty when there are none. */
  events: EventCardContentSettings[];
  /** Latest published articles, newest first (up to HOMEPAGE_NEWS_COUNT) — the full archive lives on /news. */
  newsItems: CommunityNewsRow[];
  eventsHref: string;
  eventsButtonLabel: string;
};

/**
 * One connected card: the news slider (big image, caption card with the title + a link to the
 * full article) on the right and a short list of upcoming events (up to 3) on the left, so the two
 * read as a single "what's happening" unit.
 */
export function CommunityPulseSection({ events, newsItems, eventsHref, eventsButtonLabel }: CommunityPulseSectionProps) {
  return (
    <section id="events" className={styles.section} aria-labelledby="community-pulse-heading">
      <h2 id="community-pulse-heading" className="sr-only">
        הדופק השכונתי
      </h2>
      <div className={styles.card}>
        <div className={`${styles.column} ${styles.newsColumn}`}>
          <h3 className={styles.columnTitle}>חדשות השכונה</h3>
          {newsItems.length > 0 ? (
            <NewsSlider items={newsItems} />
          ) : (
            <div className={styles.emptyState} role="status">
              <Newspaper size={28} strokeWidth={1.5} aria-hidden="true" />
              <p>אין כרגע חדשות להצגה</p>
            </div>
          )}
        </div>

        <div className={`${styles.column} ${styles.eventsColumn}`}>
          <h3 className={styles.columnTitle}>האירועים הקרובים בשכונה</h3>
          {events.length > 0 ? (
            <div className={styles.eventsList}>
              {events.map((event) => (
                <CompactEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState} role="status">
              <CalendarX size={28} strokeWidth={1.5} aria-hidden="true" />
              <p>אין כרגע אירועים קרובים</p>
            </div>
          )}
          {eventsHref && (
            <div className={styles.showAllWrap}>
              <Button href={eventsHref} variant="secondary" fullWidth icon={<ArrowLeft size={15} aria-hidden="true" />}>
                {eventsButtonLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

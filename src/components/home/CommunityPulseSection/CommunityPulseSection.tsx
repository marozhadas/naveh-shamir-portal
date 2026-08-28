import { ArrowLeft, CalendarX, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NewsCard } from "@/components/news/NewsCard/NewsCard";
import { EventCard } from "@/components/home/UpcomingEventsSection/EventCard";
import type { EventCardContentSettings, UpcomingEventsEditorSettings } from "@/editor/schemas/events.schema";
import type { CommunityNewsRow } from "@/types/community-news";
import styles from "./CommunityPulseSection.module.css";

type CommunityPulseSectionProps = {
  /** Soonest published, not-yet-past event (already selected by the caller) — null when there is none. */
  nextEvent: EventCardContentSettings | null;
  /** Up to 2 most recently published articles, newest first — the rest live on /news only. */
  newsItems: CommunityNewsRow[];
  appearance: UpcomingEventsEditorSettings["appearance"];
  eventsHref: string;
  eventsButtonLabel: string;
};

/**
 * Replaces the old 3-event grid with a single connected card: the next upcoming event on the
 * left (a third of the width) and the latest neighborhood news teasers on the right (two
 * thirds, stacked, up to 2), so the two feel like one "what's happening" unit instead of two
 * separate sections.
 */
export function CommunityPulseSection({ nextEvent, newsItems, appearance, eventsHref, eventsButtonLabel }: CommunityPulseSectionProps) {
  return (
    <section id="events" className={styles.section} aria-labelledby="community-pulse-heading">
      <h2 id="community-pulse-heading" className="sr-only">
        הדופק השכונתי
      </h2>
      <div className={styles.card}>
        <div className={`${styles.column} ${styles.newsColumn}`}>
          <h3 className={styles.columnTitle}>חדשות השכונה</h3>
          {newsItems.length > 0 ? (
            newsItems.map((article) => <NewsCard key={article.id} article={article} variant="teaser" />)
          ) : (
            <div className={styles.emptyState} role="status">
              <Newspaper size={28} strokeWidth={1.5} aria-hidden="true" />
              <p>אין כרגע חדשות להצגה</p>
            </div>
          )}
        </div>

        <div className={`${styles.column} ${styles.eventsColumn}`}>
          <h3 className={styles.columnTitle}>האירוע הקרוב בשכונה</h3>
          {nextEvent ? (
            <EventCard event={nextEvent} appearance={appearance} />
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

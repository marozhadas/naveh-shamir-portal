"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, Newspaper, Pause, Play } from "lucide-react";
import { formatNewsDateFull } from "@/utils/format-news-date";
import type { CommunityNewsRow } from "@/types/community-news";
import styles from "./NewsSlider.module.css";

const AUTOPLAY_INTERVAL_MS = 6000;

type NewsSliderProps = {
  items: CommunityNewsRow[];
};

/**
 * Homepage news carousel: one big image per article with its title/excerpt on a card at the
 * bottom, and the whole slide links to the full article. Slides crossfade (opacity) rather than
 * scroll. Autoplay stops on hover/focus, via the pause button, and is off entirely for visitors
 * who prefer reduced motion. Inactive slides are aria-hidden + unfocusable.
 */
export function NewsSlider({ items }: NewsSliderProps) {
  const count = items.length;
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external source (matchMedia)
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const playing = count > 1 && !userPaused && !hovering && !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing, count]);

  const go = useCallback((target: number) => setIndex(((target % count) + count) % count), [count]);
  // The article set can shrink (an admin unpublishes one) — clamp instead of pointing past the end.
  const active = index % count;

  return (
    <div
      className={styles.slider}
      role="region"
      aria-roledescription="קרוסלה"
      aria-label="חדשות השכונה"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
    >
      <div className={styles.viewport} aria-live={playing ? "off" : "polite"}>
        {items.map((article, i) => {
          const isActive = i === active;
          return (
            <article
              key={article.id}
              className={`${styles.slide} ${isActive ? styles.slideActive : ""}`}
              aria-hidden={!isActive}
              aria-roledescription="שקופית"
              aria-label={`${i + 1} מתוך ${count}`}
              data-testid="news-slide"
            >
              <a
                href={`/news/${article.slug}`}
                className={styles.slideLink}
                tabIndex={isActive ? 0 : -1}
                aria-label={`${article.title} — לכתבה המלאה`}
              >
                {article.image_url ? (
                  <Image
                    src={article.image_url}
                    alt=""
                    fill
                    sizes="(max-width: 880px) 100vw, 800px"
                    className={styles.image}
                    priority={i === 0}
                  />
                ) : (
                  <div className={styles.imagePlaceholder} aria-hidden="true">
                    <Newspaper size={56} strokeWidth={1.25} />
                  </div>
                )}
                <div className={styles.shade} aria-hidden="true" />
                <div className={styles.caption}>
                  {article.published_at && <span className={styles.date}>{formatNewsDateFull(article.published_at)}</span>}
                  <h3 className={styles.title}>{article.title}</h3>
                  {article.excerpt && <p className={styles.excerpt}>{article.excerpt}</p>}
                  <span className={styles.more}>
                    לכתבה המלאה
                    <ArrowLeft size={16} aria-hidden="true" />
                  </span>
                </div>
              </a>
            </article>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.control} ${styles.pause}`}
            onClick={() => setUserPaused((value) => !value)}
            aria-label={userPaused ? "הפעלת החלפה אוטומטית" : "עצירת החלפה אוטומטית"}
          >
            {userPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
          {/* RTL: "previous" sits on the right edge, "next" on the left. */}
          <button type="button" className={`${styles.control} ${styles.arrow} ${styles.arrowPrev}`} onClick={() => go(active - 1)} aria-label="הכתבה הקודמת">
            <ChevronRight size={24} aria-hidden="true" />
          </button>
          <button type="button" className={`${styles.control} ${styles.arrow} ${styles.arrowNext}`} onClick={() => go(active + 1)} aria-label="הכתבה הבאה">
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <div className={styles.dots}>
            {items.map((article, i) => (
              <button
                key={article.id}
                type="button"
                className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
                onClick={() => go(i)}
                aria-label={`מעבר לכתבה ${i + 1}`}
                aria-current={i === active}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

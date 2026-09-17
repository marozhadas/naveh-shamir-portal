"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import type { BusinessReviewRow } from "@/types/business-review";
import styles from "./BusinessReviewsCarousel.module.css";

type BusinessReviewsCarouselProps = {
  reviews: BusinessReviewRow[];
};

const ROTATE_INTERVAL_MS = 7000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Modeled closely on BusinessTestimonialsCarousel (same accessible single-slide pattern: gentle
 * auto-rotate that pauses on hover/focus and never runs at all under prefers-reduced-motion, real
 * <button> prev/next controls, dot indicators as role="tablist") — but always keeps the prev/next
 * buttons visible on mobile (the testimonials one hides them there), since the spec explicitly
 * requires them there for reviews.
 */
export function BusinessReviewsCarousel({ reviews }: BusinessReviewsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reviews.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % reviews.length);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [reviews.length, paused]);

  if (reviews.length === 0) {
    return <p className={styles.empty}>עדיין אין ביקורות לעסק הזה.</p>;
  }

  const index = activeIndex % reviews.length;
  const active = reviews[index];

  function showNext() {
    setActiveIndex((current) => (current + 1) % reviews.length);
  }

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + reviews.length) % reviews.length);
  }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className={styles.carousel}>
        {reviews.length > 1 && (
          <button type="button" className={styles.navButton} aria-label="הביקורת הקודמת" onClick={showPrevious}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        )}

        <div className={styles.slideArea} aria-live="polite" aria-atomic="true">
          <Quote className={styles.quoteIcon} size={28} aria-hidden="true" />
          <p className={styles.text}>{active.content}</p>
          <p className={styles.author}>
            {active.author_name}
            <span className={styles.date}> · {formatDate(active.created_at)}</span>
          </p>
        </div>

        {reviews.length > 1 && (
          <button type="button" className={styles.navButton} aria-label="הביקורת הבאה" onClick={showNext}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {reviews.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label="בחירת ביקורת להצגה">
          {reviews.map((review, dotIndex) => (
            <button
              key={review.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-label={`ביקורת ${dotIndex + 1} מתוך ${reviews.length}`}
              className={`${styles.dot} ${dotIndex === index ? styles.dotActive : ""}`}
              onClick={() => setActiveIndex(dotIndex)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

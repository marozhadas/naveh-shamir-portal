"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import type { BusinessTestimonial } from "@/types/business";
import styles from "./BusinessTestimonialsCarousel.module.css";

type BusinessTestimonialsCarouselProps = {
  testimonials: BusinessTestimonial[];
};

const ROTATE_INTERVAL_MS = 7000;

/**
 * A single-slide-at-a-time carousel — auto-rotates (paused while the visitor is interacting with
 * it, and never at all under prefers-reduced-motion) with manual prev/next buttons and dot
 * indicators as the accessible, always-available alternative. RTL: the left-pointing chevron
 * advances (matches BusinessGallery's existing convention), the right-pointing one goes back.
 */
export function BusinessTestimonialsCarousel({ testimonials }: BusinessTestimonialsCarouselProps) {
  const sorted = [...testimonials].sort((a, b) => a.order - b.order);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (sorted.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % sorted.length);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [sorted.length, paused]);

  if (sorted.length === 0) return null;

  // The set itself can change on a future re-render — clamp instead of going out of bounds.
  const index = activeIndex % sorted.length;
  const active = sorted[index];

  function showNext() {
    setActiveIndex((current) => (current + 1) % sorted.length);
  }

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + sorted.length) % sorted.length);
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="testimonials-heading"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <h2 id="testimonials-heading" className={styles.heading}>
        המלצות
      </h2>

      <div className={styles.carousel}>
        {sorted.length > 1 && (
          <button type="button" className={`${styles.navButton} ${styles.navPrevious}`} aria-label="ההמלצה הקודמת" onClick={showPrevious}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        )}

        <div className={styles.slideArea} aria-live="polite" aria-atomic="true">
          <Quote className={styles.quoteIcon} size={28} aria-hidden="true" />
          <p className={styles.text}>{active.text}</p>
          <p className={styles.author}>
            {active.authorName}
            {active.roleOrContext && <span className={styles.role}> · {active.roleOrContext}</span>}
          </p>
        </div>

        {sorted.length > 1 && (
          <button type="button" className={`${styles.navButton} ${styles.navNext}`} aria-label="ההמלצה הבאה" onClick={showNext}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {sorted.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label="בחירת המלצה להצגה">
          {sorted.map((testimonial, dotIndex) => (
            <button
              key={testimonial.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-label={`המלצה ${dotIndex + 1} מתוך ${sorted.length}`}
              className={`${styles.dot} ${dotIndex === index ? styles.dotActive : ""}`}
              onClick={() => setActiveIndex(dotIndex)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

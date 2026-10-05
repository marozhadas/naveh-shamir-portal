"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ListingGallery.module.css";

type ListingGalleryProps = {
  images: { src: string; alt: string }[];
};

const SWIPE_THRESHOLD_PX = 40;

/**
 * Listing photo gallery: one large image with prev/next arrows (and swipe on touch) and a row of
 * small square thumbnails underneath. The large image is shown whole (object-fit: contain) so a
 * seller's photo is never cropped; thumbnails are cropped squares purely for scanning.
 */
export function ListingGallery({ images }: ListingGalleryProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = images.length;
  const active = Math.min(index, count - 1);
  const current = images[active];

  function go(target: number) {
    setIndex(((target % count) + count) % count);
  }

  function onTouchEnd(clientX: number) {
    if (touchStartX.current === null || count < 2) return;
    const delta = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    // RTL: swiping right (positive delta) reveals the *next* image, like turning a right-bound page.
    go(delta > 0 ? active + 1 : active - 1);
  }

  return (
    <div className={styles.gallery} role="region" aria-roledescription="קרוסלה" aria-label="תמונות המודעה">
      <div
        className={styles.main}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => onTouchEnd(event.changedTouches[0].clientX)}
      >
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          sizes="(max-width: 768px) 100vw, 480px"
          className={styles.mainImage}
          priority={active === 0}
        />
        {count > 1 && (
          <>
            {/* RTL: "previous" on the right edge, "next" on the left. */}
            <button type="button" className={`${styles.arrow} ${styles.arrowPrev}`} onClick={() => go(active - 1)} aria-label="התמונה הקודמת">
              <ChevronRight size={22} aria-hidden="true" />
            </button>
            <button type="button" className={`${styles.arrow} ${styles.arrowNext}`} onClick={() => go(active + 1)} aria-label="התמונה הבאה">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <span className={styles.counter} aria-live="polite" dir="ltr">
              {active + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className={styles.thumbs}>
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                className={`${styles.thumb} ${i === active ? styles.thumbActive : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`הצגת תמונה ${i + 1} מתוך ${count}`}
                aria-current={i === active}
              >
                <Image src={image.src} alt="" fill sizes="80px" className={styles.thumbImage} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

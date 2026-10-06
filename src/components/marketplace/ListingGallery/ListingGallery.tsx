"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "./ListingGallery.module.css";

type ListingGalleryProps = {
  images: { src: string; alt: string }[];
};

const SWIPE_THRESHOLD_PX = 40;

/**
 * Listing photo gallery: one large image with prev/next arrows (and swipe on touch) and a row of
 * small square thumbnails underneath. Both are center-cropped (object-fit: cover) so the frame is
 * always filled edge to edge — no empty bands beside portrait photos. Clicking the large image
 * opens a full-size lightbox (native <dialog>: Esc, focus trap and backdrop come for free) that
 * shows the whole, uncropped photo and shares the same current index.
 */
export function ListingGallery({ images }: ListingGalleryProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const swiped = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const count = images.length;
  const active = Math.min(index, count - 1);
  const current = images[active];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (lightboxOpen && !dialog.open) dialog.showModal();
    if (!lightboxOpen && dialog.open) dialog.close();
  }, [lightboxOpen]);

  function go(target: number) {
    setIndex(((target % count) + count) % count);
  }

  function onTouchEnd(clientX: number) {
    if (touchStartX.current === null || count < 2) return;
    const delta = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    // A swipe must not also register as a click that opens the lightbox.
    swiped.current = true;
    // RTL: swiping right (positive delta) reveals the *next* image, like turning a right-bound page.
    go(delta > 0 ? active + 1 : active - 1);
  }

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (count < 2) return;
    // RTL: the "next" button is on the left, so ArrowLeft goes forward.
    if (event.key === "ArrowLeft") go(active + 1);
    if (event.key === "ArrowRight") go(active - 1);
  }

  return (
    <div className={styles.gallery} role="region" aria-roledescription="קרוסלה" aria-label="תמונות המודעה">
      <div
        className={styles.main}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
          swiped.current = false;
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
        <button
          type="button"
          className={styles.zoom}
          onClick={() => {
            if (!swiped.current) setLightboxOpen(true);
          }}
          aria-label="הצגת התמונה בגודל מלא"
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

      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        aria-label="תצוגת תמונה מוגדלת"
        onClose={(event) => {
          // "close" is dispatched asynchronously; if the dialog was already reopened by the time a
          // stale event lands, it must not flip the state back to closed.
          if (!event.currentTarget.open) setLightboxOpen(false);
        }}
        onKeyDown={onDialogKeyDown}
        onClick={(event) => {
          // Click on the dimmed backdrop (the dialog element itself), not on its contents.
          if (event.target === event.currentTarget) setLightboxOpen(false);
        }}
      >
        {lightboxOpen && (
          <div className={styles.stage}>
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt}
              fill
              sizes="100vw"
              quality={85}
              className={styles.stageImage}
            />
          </div>
        )}
        <button type="button" className={`${styles.lightboxControl} ${styles.close}`} onClick={() => setLightboxOpen(false)} aria-label="סגירה">
          <X size={22} aria-hidden="true" />
        </button>
        {count > 1 && (
          <>
            <button type="button" className={`${styles.lightboxControl} ${styles.lightboxPrev}`} onClick={() => go(active - 1)} aria-label="התמונה הקודמת">
              <ChevronRight size={26} aria-hidden="true" />
            </button>
            <button type="button" className={`${styles.lightboxControl} ${styles.lightboxNext}`} onClick={() => go(active + 1)} aria-label="התמונה הבאה">
              <ChevronLeft size={26} aria-hidden="true" />
            </button>
            <span className={styles.lightboxCounter} dir="ltr">
              {active + 1} / {count}
            </span>
          </>
        )}
      </dialog>
    </div>
  );
}

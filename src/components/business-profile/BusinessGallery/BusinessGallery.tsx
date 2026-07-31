"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { BusinessGalleryImage } from "@/types/business";
import styles from "./BusinessGallery.module.css";

type BusinessGalleryProps = {
  images: BusinessGalleryImage[];
};

/**
 * A simple accessible <dialog>-based lightbox (spec section 13: "if there's no existing
 * lightbox infrastructure, use a plain accessible Dialog" — there isn't one, so this is that).
 * Native <dialog> gives focus trap + Escape-to-close + focus restoration for free.
 */
export function BusinessGallery({ images }: BusinessGalleryProps) {
  const sorted = [...images].sort((a, b) => a.order - b.order);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeIndex !== null && !dialog.open) dialog.showModal();
    if (activeIndex === null && dialog.open) dialog.close();
  }, [activeIndex]);

  if (sorted.length === 0) return null;

  function showNext() {
    setActiveIndex((current) => (current === null ? null : (current + 1) % sorted.length));
  }

  function showPrevious() {
    setActiveIndex((current) => (current === null ? null : (current - 1 + sorted.length) % sorted.length));
  }

  const activeImage = activeIndex !== null ? sorted[activeIndex] : null;

  return (
    <section className={styles.section} aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className={styles.heading}>
        גלריה
      </h2>
      <div className={styles.grid}>
        {sorted.map((image, index) => (
          <button
            key={image.id}
            type="button"
            className={styles.thumb}
            onClick={() => setActiveIndex(index)}
            aria-label={`הצגת תמונה מוגדלת: ${image.alt}`}
          >
            {image.src ? (
              <Image src={image.src} alt={image.alt} fill sizes="200px" className={styles.thumbImage} />
            ) : (
              <span className={styles.thumbPlaceholder} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={activeImage?.alt ?? "תצוגת תמונה מוגדלת"}
        onClose={() => setActiveIndex(null)}
        onCancel={(event) => {
          event.preventDefault();
          setActiveIndex(null);
        }}
        onKeyDown={(event) => {
          // RTL: the left-pointing chevron is "next", the right-pointing one is "previous" (see the icons below).
          if (event.key === "ArrowLeft") showNext();
          if (event.key === "ArrowRight") showPrevious();
        }}
      >
        {activeImage && (
          <div className={styles.dialogContent}>
            <button type="button" className={styles.closeButton} aria-label="סגירת תצוגת התמונה" onClick={() => setActiveIndex(null)}>
              <X size={20} aria-hidden="true" />
            </button>
            {sorted.length > 1 && (
              <button type="button" className={`${styles.navButton} ${styles.navPrevious}`} aria-label="התמונה הקודמת" onClick={showPrevious}>
                <ChevronRight size={22} aria-hidden="true" />
              </button>
            )}
            <div className={styles.dialogImageArea}>
              {activeImage.src ? (
                <Image src={activeImage.src} alt={activeImage.alt} fill sizes="90vw" className={styles.dialogImage} />
              ) : (
                <span className={styles.thumbPlaceholder} aria-hidden="true" />
              )}
            </div>
            {sorted.length > 1 && (
              <button type="button" className={`${styles.navButton} ${styles.navNext}`} aria-label="התמונה הבאה" onClick={showNext}>
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </dialog>
    </section>
  );
}

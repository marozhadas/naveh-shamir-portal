"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { HERO_SHORTCUTS } from "@/data/hero-shortcuts";
import type { HeroEditorSettings } from "@/editor/schemas/hero.schema";
import type { HeroGalleryImage } from "@/types/hero-gallery";
import styles from "./HeroSection.module.css";

/** Hero's own "content column width" scale — distinct from the shared section ContainerWidthToken. */
const MAX_CONTENT_WIDTH_PX: Record<HeroEditorSettings["layout"]["maxContentWidth"], string> = {
  sm: "600px",
  md: "760px",
  lg: "920px",
};

/** The original hero photo — always the first slide, followed by whatever gallery images were uploaded via the editor. */
const DEFAULT_BACKGROUND: HeroGalleryImage = { id: "default", url: "/images/hero-background.jpg", alt: "", order: 0 };

const ROTATE_INTERVAL_MS = 3000;

const TONE_CLASS = {
  slate: styles.toneSlate,
  yellow: styles.toneYellow,
  green: styles.toneGreen,
  sky: styles.toneSky,
  blue: styles.toneBlue,
} as const;

/** "בנווה שמיר" must never break across two lines — a non-breaking space joins the neighbourhood name. */
function keepNeighbourhoodNameTogether(title: string): string {
  return title.replace(/נווה שמיר/g, "נווה\u00A0שמיר");
}

function useRotatingIndex(count: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  // The image set itself can change (an admin adds/removes one) — clamp instead of going out of bounds.
  return index % count;
}

type HeroSectionProps = {
  settings: HeroEditorSettings;
  /** Live, shared background images uploaded via the floating editor (spec: must show for every visitor, not just the editing admin). They rotate after the static default photo. */
  galleryImages?: HeroGalleryImage[];
};

/**
 * Edge-to-edge hero: the rotating photo runs the full width under the header, with the headline and a pill search bar on
 * top of it, and the row of shortcut icons right underneath. Text content (title, search placeholder, whether the search
 * shows) still comes from the editor settings; the look (dark headline on a light veil, full-bleed image) is fixed.
 */
export function HeroSection({ settings, galleryImages }: HeroSectionProps) {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const router = useRouter();

  const images = [DEFAULT_BACKGROUND, ...(galleryImages ?? [])];
  const activeIndex = useRotatingIndex(images.length);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setFeedback("כתבו מה מחפשים כדי לחפש בפורטל.");
      return;
    }
    router.push(`/businesses?q=${encodeURIComponent(trimmed)}`);
  }

  const heroStyle = { "--hero-max-content-width": MAX_CONTENT_WIDTH_PX[settings.layout.maxContentWidth] } as CSSProperties;

  return (
    <section id="top" className={styles.hero} style={heroStyle}>
      <div className={styles.stage}>
        <div className={styles.backgroundLayer} aria-hidden="true">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={styles.backgroundImage}
              style={{ backgroundImage: `url("${image.url}")`, opacity: index === activeIndex ? 1 : 0 }}
            />
          ))}
        </div>
        <div className={styles.veil} aria-hidden="true" />

        <div className={styles.content}>
          <h1 className={styles.title}>{keepNeighbourhoodNameTogether(settings.content.title)}</h1>

          {settings.visibility.showSearch && (
            <form role="search" className={styles.searchForm} onSubmit={handleSubmit}>
              <div className={styles.searchField}>
                <label htmlFor="hero-search" className="sr-only">
                  חיפוש בפורטל נווה שמיר
                </label>
                <input
                  id="hero-search"
                  type="search"
                  className={styles.searchInput}
                  placeholder={settings.content.searchPlaceholder}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <span className={styles.searchDivider} aria-hidden="true" />
                <button type="submit" className={styles.searchButton} aria-label="חיפוש">
                  <Search size={22} aria-hidden="true" />
                </button>
              </div>
            </form>
          )}
          {settings.visibility.showSearch && (
            <p aria-live="polite" className={styles.searchFeedback}>
              {feedback}
            </p>
          )}
        </div>
      </div>

      <nav aria-label="קישורים מהירים" className={styles.shortcuts}>
        <ul className={styles.shortcutList}>
          {HERO_SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <li key={shortcut.id}>
                <Link href={shortcut.href} className={styles.shortcut}>
                  <span className={`${styles.shortcutCircle} ${TONE_CLASS[shortcut.tone]}`}>
                    <Icon size={28} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className={styles.shortcutLabel}>{shortcut.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}

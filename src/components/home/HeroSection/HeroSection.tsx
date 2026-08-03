"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  colorTokenToCssVar,
  fontWeightTokenToCssVar,
  radiusTokenToCssVar,
  shadowTokenToCssVar,
  spacingTokenToCssVar,
} from "@/styles/token-to-css-variable";
import type { HeroEditorSettings } from "@/editor/schemas/hero.schema";
import type { HeroGalleryImage } from "@/types/hero-gallery";
import styles from "./HeroSection.module.css";

/** Hero's own "content column width" scale — distinct from the shared section ContainerWidthToken. */
const MAX_CONTENT_WIDTH_PX: Record<HeroEditorSettings["layout"]["maxContentWidth"], string> = {
  sm: "600px",
  md: "760px",
  lg: "920px",
};

/** Shown whenever no gallery images have been uploaded yet — keeps the Hero looking exactly like it did before the gallery feature existed. */
const DEFAULT_BACKGROUND: HeroGalleryImage = { id: "default", url: "/images/hero-background.jpg", alt: "", order: 0 };

const ROTATE_INTERVAL_MS = 6000;

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
  /** Live, shared background images uploaded via the floating editor (spec: must show for every visitor, not just the editing admin). Empty/omitted falls back to the static default photo. */
  galleryImages?: HeroGalleryImage[];
};

export function HeroSection({ settings, galleryImages }: HeroSectionProps) {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const router = useRouter();

  const images = galleryImages && galleryImages.length > 0 ? galleryImages : [DEFAULT_BACKGROUND];
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

  const heroStyle = {
    "--hero-bg": colorTokenToCssVar(settings.appearance.backgroundColorToken),
    "--hero-padding-block-start": spacingTokenToCssVar(settings.layout.paddingBlockDesktop.start),
    "--hero-padding-block-end": spacingTokenToCssVar(settings.layout.paddingBlockDesktop.end),
    "--hero-padding-block-start-mobile": spacingTokenToCssVar(settings.responsive.paddingBlockMobile.start),
    "--hero-padding-block-end-mobile": spacingTokenToCssVar(settings.responsive.paddingBlockMobile.end),
    "--hero-max-content-width": MAX_CONTENT_WIDTH_PX[settings.layout.maxContentWidth],
    "--hero-content-align": settings.appearance.contentAlignment,
    "--hero-content-align-mobile": settings.responsive.contentAlignmentMobile,
    "--hero-title-color": colorTokenToCssVar(settings.appearance.titleColorToken),
    "--hero-title-size": `${settings.appearance.titleSizeToken}px`,
    "--hero-title-size-mobile": `${settings.responsive.titleSizeMobileToken}px`,
    "--hero-title-weight": fontWeightTokenToCssVar(settings.appearance.titleWeightToken),
    "--hero-description-color": colorTokenToCssVar(settings.appearance.descriptionColorToken),
    "--hero-description-size": `${settings.appearance.descriptionSizeToken}px`,
    "--hero-title-gap": spacingTokenToCssVar(settings.layout.titleToDescriptionGap),
    "--hero-search-gap": spacingTokenToCssVar(settings.layout.descriptionToSearchGap),
    "--search-bar-radius": radiusTokenToCssVar(settings.appearance.searchBarRadiusToken),
    "--search-bar-shadow": shadowTokenToCssVar(settings.appearance.searchBarShadowToken),
  } as CSSProperties;

  return (
    <section id="top" className={styles.hero} style={heroStyle}>
      <div className={styles.card}>
        <div className={styles.backgroundLayer} aria-hidden="true">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={styles.backgroundImage}
              style={{ backgroundImage: `url("${image.url}")`, opacity: index === activeIndex ? 1 : 0 }}
            />
          ))}
        </div>
        <div className={styles.overlay} />

        <div className={styles.content}>
          <h1 className={styles.title}>{settings.content.title}</h1>
          {settings.content.description && <p className={styles.subtitle}>{settings.content.description}</p>}

          {settings.visibility.showSearch && (
            <form role="search" className={styles.searchForm} onSubmit={handleSubmit}>
              <SearchBar
                id="hero-search"
                label="חיפוש בפורטל נווה שמיר"
                placeholder={settings.content.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="submit" className="sr-only">
                חיפוש
              </button>
            </form>
          )}
          {settings.visibility.showSearch && (
            <p aria-live="polite" className={styles.searchFeedback}>
              {feedback}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

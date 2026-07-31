"use client";

import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  colorTokenToCssVar,
  fontSizeTokenToCssVar,
  fontWeightTokenToCssVar,
  radiusTokenToCssVar,
  shadowTokenToCssVar,
  spacingTokenToCssVar,
} from "@/styles/token-to-css-variable";
import type { HeroEditorSettings } from "@/editor/schemas/hero.schema";
import styles from "./HeroSection.module.css";

const SKYLINE_BARS = [42, 68, 30, 90, 54, 36, 72, 48, 26, 60, 84, 40, 58, 32].map((height, index) => ({
  height,
  width: 24 + (index % 3) * 6,
}));

/** Hero's own "content column width" scale — distinct from the shared section ContainerWidthToken. */
const MAX_CONTENT_WIDTH_PX: Record<HeroEditorSettings["layout"]["maxContentWidth"], string> = {
  sm: "600px",
  md: "760px",
  lg: "920px",
};

type HeroSectionProps = {
  settings: HeroEditorSettings;
};

export function HeroSection({ settings }: HeroSectionProps) {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(
      query.trim()
        ? `החיפוש עדיין לא מחובר למאגר — בינתיים אפשר לעיין בעסקים ובאירועים בהמשך העמוד.`
        : "כתבו מה מחפשים כדי לחפש בפורטל.",
    );
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
    "--hero-title-size": fontSizeTokenToCssVar(settings.appearance.titleSizeToken),
    "--hero-title-size-mobile": fontSizeTokenToCssVar(settings.responsive.titleSizeMobileToken),
    "--hero-title-weight": fontWeightTokenToCssVar(settings.appearance.titleWeightToken),
    "--hero-description-color": colorTokenToCssVar(settings.appearance.descriptionColorToken),
    "--hero-title-gap": spacingTokenToCssVar(settings.layout.titleToDescriptionGap),
    "--hero-search-gap": spacingTokenToCssVar(settings.layout.descriptionToSearchGap),
    "--search-bar-radius": radiusTokenToCssVar(settings.appearance.searchBarRadiusToken),
    "--search-bar-shadow": shadowTokenToCssVar(settings.appearance.searchBarShadowToken),
    "--hero-illustration-display": settings.visibility.showIllustration ? "flex" : "none",
    "--hero-illustration-display-mobile": settings.responsive.showIllustrationMobile ? "flex" : "none",
  } as CSSProperties;

  return (
    <section id="top" className={styles.hero} style={heroStyle}>
      <div className={styles.skyline} aria-hidden="true">
        {SKYLINE_BARS.map((bar, index) => (
          <div key={index} className={styles.skylineBar} style={{ width: bar.width, height: bar.height }} />
        ))}
      </div>

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
    </section>
  );
}

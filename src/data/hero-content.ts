import type { HeroEditorSettings } from "@/editor/schemas/hero.schema";

/**
 * Canonical Hero content/settings, transcribed from the already-shipped
 * design (HeroSection.tsx / HeroSection.module.css) — this is site-owned
 * data, not editor data. The editor's defaults re-export this same object
 * (src/editor/config/editor-defaults.ts) rather than the other way around,
 * so HeroSection never needs to depend on anything under src/editor at
 * runtime — only this type import, which TypeScript erases entirely.
 */
export const DEFAULT_HERO_SETTINGS: HeroEditorSettings = {
  content: {
    // Matches the Figma Hero redesign: the site name as the big headline, the tagline underneath.
    title: "נווה שמיר",
    description: "הפורטל של השכונה",
    searchPlaceholder: "מה מחפשים?",
  },
  appearance: {
    backgroundColorToken: "inverse",
    titleColorToken: "text-inverse",
    descriptionColorToken: "muted",
    // Explicit request: oversized 220px headline.
    titleSizeToken: "4xl",
    // Figma specifies "Ploni ML v2 AAA:UltraBold" for the Hero title — the ultrabold (800) weight
    // file, not the heavier black (900) one.
    titleWeightToken: "ultrabold",
    // Explicit request: 100px tagline.
    descriptionSizeToken: "3xl",
    searchBarRadiusToken: "pill",
    searchBarShadowToken: "none",
    contentAlignment: "center",
  },
  layout: {
    maxContentWidth: "lg",
    paddingBlockDesktop: { start: "64", end: "96" },
    titleToDescriptionGap: "16",
    descriptionToSearchGap: "32",
  },
  responsive: {
    titleSizeMobileToken: "2xl",
    paddingBlockMobile: { start: "64", end: "96" },
    contentAlignmentMobile: "center",
    showIllustrationMobile: true,
  },
  visibility: {
    showSearch: true,
    showIllustration: true,
  },
};

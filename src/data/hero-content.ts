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
    title: "כל נווה שמיר, במקום אחד.",
    description: "המרכז המקומי שלכם לעסקים, חדשות, אירועים וחיבור קהילתי.",
    searchPlaceholder: "מה מחפשים?",
  },
  appearance: {
    backgroundColorToken: "inverse",
    titleColorToken: "text-inverse",
    descriptionColorToken: "muted",
    // Live CSS uses a fluid clamp(30px, 5vw, 48px) — no single token can reproduce that exactly.
    // "2xl" (40px) is the closest discrete value actually inside the clamp's own range.
    titleSizeToken: "2xl",
    titleWeightToken: "black",
    searchBarRadiusToken: "pill",
    searchBarShadowToken: "none",
    contentAlignment: "center",
  },
  layout: {
    maxContentWidth: "md",
    paddingBlockDesktop: { start: "64", end: "96" },
    titleToDescriptionGap: "16",
    descriptionToSearchGap: "32",
  },
  responsive: {
    // Same clamp caveat as titleSizeToken above — "xl" (28px) sits near the clamp's own
    // 30px floor, which is what narrow viewports actually resolve to today.
    titleSizeMobileToken: "xl",
    paddingBlockMobile: { start: "64", end: "96" },
    contentAlignmentMobile: "center",
    showIllustrationMobile: true,
  },
  visibility: {
    showSearch: true,
    showIllustration: true,
  },
};

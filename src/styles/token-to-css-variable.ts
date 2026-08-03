import type {
  ColorToken,
  ContainerWidthToken,
  FontSizeToken,
  FontWeightToken,
  RadiusToken,
  ShadowToken,
  SpacingToken,
} from "@/editor/types/editor.types";

/**
 * Translates a bounded design token into the real CSS value backing it.
 * Lives outside src/editor/ on purpose: site components (e.g. HeroSection)
 * call this at runtime to turn validated settings into CSS Custom Property
 * values, and must not depend on editor code to do so — this is a design
 * system utility, not editor logic. (The `import type` above is compile-time
 * only and is erased entirely, so it doesn't create a real dependency either.)
 *
 * Every value here must correspond to a real custom property in src/styles/tokens.css.
 */
const COLOR_TOKEN_TO_CSS_VAR: Record<ColorToken, string> = {
  navy: "var(--navy-900)",
  yellow: "var(--yellow-500)",
  green: "var(--green-600)",
  orange: "var(--orange-500)",
  cyan: "var(--cyan-500)",
  whatsapp: "var(--color-whatsapp)",
  surface: "var(--color-bg-surface)",
  background: "var(--color-bg-base)",
  inverse: "var(--color-bg-inverse)",
  "navy-muted": "var(--navy-700)",
  highlight: "var(--color-highlight-bg)",
  success: "var(--color-success-bg)",
  "text-primary": "var(--color-text-primary)",
  "text-secondary": "var(--color-text-secondary)",
  "text-inverse": "var(--color-text-inverse)",
  "text-on-accent": "var(--color-text-on-accent)",
  muted: "var(--slate-200)",
  border: "var(--color-border-default)",
};

/** Spacing token label (in px) -> the actual --space-N variable at that pixel value. */
const SPACING_TOKEN_TO_CSS_VAR: Record<SpacingToken, string> = {
  "0": "0px",
  "4": "var(--space-1)",
  "8": "var(--space-2)",
  "12": "var(--space-3)",
  "16": "var(--space-4)",
  "20": "var(--space-5)",
  "24": "var(--space-6)",
  "32": "var(--space-8)",
  "40": "var(--space-10)",
  "48": "var(--space-12)",
  "64": "var(--space-16)",
  "80": "var(--space-20)",
  "96": "var(--space-24)",
};

const RADIUS_TOKEN_TO_CSS_VAR: Record<RadiusToken, string> = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  pill: "var(--radius-pill)",
};

const SHADOW_TOKEN_TO_CSS_VAR: Record<ShadowToken, string> = {
  none: "none",
  sm: "var(--shadow-sm)",
  card: "var(--shadow-card)",
  "card-hover": "var(--shadow-card-hover)",
  modal: "var(--shadow-modal)",
};

const FONT_SIZE_TOKEN_TO_CSS_VAR: Record<FontSizeToken, string> = {
  xs: "var(--fs-caption)",
  sm: "var(--fs-body-sm)",
  base: "var(--fs-body)",
  lg: "var(--fs-h3)",
  xl: "var(--fs-h2)",
  "2xl": "var(--fs-h1)",
  display: "var(--fs-display-1)",
};

const FONT_WEIGHT_TOKEN_TO_CSS_VAR: Record<FontWeightToken, string> = {
  light: "var(--fw-light)",
  regular: "var(--fw-regular)",
  medium: "var(--fw-medium)",
  demibold: "var(--fw-demibold)",
  bold: "var(--fw-bold)",
  ultrabold: "var(--fw-ultrabold)",
  black: "var(--fw-black)",
};

const CONTAINER_WIDTH_TOKEN_TO_PX: Record<ContainerWidthToken, string> = {
  md: "1024px",
  lg: "1280px",
  xl: "1440px",
};

export function colorTokenToCssVar(token: ColorToken): string {
  return COLOR_TOKEN_TO_CSS_VAR[token];
}

export function spacingTokenToCssVar(token: SpacingToken): string {
  return SPACING_TOKEN_TO_CSS_VAR[token];
}

export function radiusTokenToCssVar(token: RadiusToken): string {
  return RADIUS_TOKEN_TO_CSS_VAR[token];
}

export function shadowTokenToCssVar(token: ShadowToken): string {
  return SHADOW_TOKEN_TO_CSS_VAR[token];
}

export function fontSizeTokenToCssVar(token: FontSizeToken): string {
  return FONT_SIZE_TOKEN_TO_CSS_VAR[token];
}

export function fontWeightTokenToCssVar(token: FontWeightToken): string {
  return FONT_WEIGHT_TOKEN_TO_CSS_VAR[token];
}

export function containerWidthTokenToCssValue(token: ContainerWidthToken): string {
  return CONTAINER_WIDTH_TOKEN_TO_PX[token];
}

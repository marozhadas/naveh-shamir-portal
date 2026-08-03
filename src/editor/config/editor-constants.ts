import type {
  ColorToken,
  ContainerWidthToken,
  FontSizeToken,
  FontWeightToken,
  RadiusToken,
  ShadowToken,
  SpacingToken,
} from "@/editor/types/editor.types";

/** Read-only hex reference shown next to each color swatch (spec: "value for reading only"). Sourced from src/styles/tokens.css. */
export const COLOR_TOKEN_HEX: Record<ColorToken, string> = {
  navy: "#1E3857",
  yellow: "#EFC40F",
  green: "#98CC1D",
  orange: "#F2590C",
  cyan: "#1FC5DB",
  whatsapp: "#25D366",
  surface: "#FFFFFF",
  background: "#F8FAFC",
  inverse: "#1E3857",
  "navy-muted": "#2A4863",
  highlight: "#FEF1D2",
  success: "#E4F4DE",
  "text-primary": "#1E3857",
  "text-secondary": "#5A6B7D",
  "text-inverse": "#FFFFFF",
  "text-on-accent": "#1E3857",
  muted: "#E2E8F0",
  border: "#E2E8F0",
};

export const COLOR_TOKEN_LABEL: Record<ColorToken, string> = {
  navy: "נייבי (מותג)",
  yellow: "צהוב (מותג)",
  green: "ירוק (מותג)",
  orange: "כתום",
  cyan: "טורקיז",
  whatsapp: "ירוק וואטסאפ",
  surface: "משטח לבן",
  background: "רקע בסיס",
  inverse: "רקע כהה",
  "navy-muted": "נייבי בהיר",
  highlight: "הדגשה צהובה",
  success: "הדגשה ירוקה",
  "text-primary": "טקסט ראשי",
  "text-secondary": "טקסט משני",
  "text-inverse": "טקסט הפוך (בהיר)",
  "text-on-accent": "טקסט על הדגשה",
  muted: "אפור עדין",
  border: "גבול",
};

export const SPACING_TOKEN_LABEL: Record<SpacingToken, string> = {
  "0": "0px",
  "4": "4px",
  "8": "8px",
  "12": "12px",
  "16": "16px",
  "20": "20px",
  "24": "24px",
  "32": "32px",
  "40": "40px",
  "48": "48px",
  "64": "64px",
  "80": "80px",
  "96": "96px",
};

export const FONT_SIZE_TOKEN_LABEL: Record<FontSizeToken, string> = {
  xs: "זעיר (12px)",
  sm: "קטן (14px)",
  base: "רגיל (16px)",
  lg: "גדול (20px)",
  xl: "גדול מאוד (28px)",
  "2xl": "כותרת (40px)",
  display: "תצוגה (56px)",
  "3xl": "ענק (100px)",
  "4xl": "ענק מאוד (220px)",
};

export const FONT_WEIGHT_TOKEN_LABEL: Record<FontWeightToken, string> = {
  light: "קליל (300)",
  regular: "רגיל (400)",
  medium: "בינוני (500)",
  demibold: "מודגש למחצה (600)",
  bold: "מודגש (700)",
  ultrabold: "מודגש מאוד (800)",
  black: "שחור (900)",
};

export const RADIUS_TOKEN_LABEL: Record<RadiusToken, string> = {
  sm: "קטן",
  md: "בינוני",
  lg: "גדול",
  xl: "גדול מאוד",
  pill: "עגול לגמרי",
};

export const SHADOW_TOKEN_LABEL: Record<ShadowToken, string> = {
  none: "ללא צל",
  sm: "עדין",
  card: "כרטיס",
  "card-hover": "כרטיס (Hover)",
  modal: "חזק",
};

export const CONTAINER_WIDTH_TOKEN_LABEL: Record<ContainerWidthToken, string> = {
  md: "בינוני (1024px)",
  lg: "גדול (1280px)",
  xl: "רחב (1440px)",
};

export const HERO_MAX_CONTENT_WIDTH_LABEL: Record<"sm" | "md" | "lg", string> = {
  sm: "קטן",
  md: "בינוני",
  lg: "גדול",
};

import type { EssentialNumberIconTone } from "@/types/essential-number";

/** Closed set of icon-tone CSS variables — the admin picks one of these tones, never free CSS (spec requirement). */
export const ICON_TONE_VARS: Record<EssentialNumberIconTone, { bg: string; fg: string }> = {
  blue: { bg: "var(--blue-100)", fg: "var(--blue-700)" },
  green: { bg: "var(--green-100)", fg: "var(--green-700)" },
  orange: { bg: "var(--orange-100)", fg: "var(--orange-500)" },
  red: { bg: "var(--red-100)", fg: "var(--red-600)" },
  purple: { bg: "var(--purple-100)", fg: "var(--purple-700)" },
  gray: { bg: "var(--slate-100)", fg: "var(--slate-600)" },
};

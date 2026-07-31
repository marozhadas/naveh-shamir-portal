import type { ColorToken } from "@/editor/types/editor.types";
import { COLOR_TOKEN_HEX } from "@/editor/config/editor-constants";

/** WCAG relative luminance / contrast ratio from a hex string — no external a11y engine needed for this. */
function hexToRelativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = hexToRelativeLuminance(hexA);
  const lumB = hexToRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastCheck = {
  ratio: number;
  passesAA: boolean;
  isUnreadable: boolean;
};

/** Spec section 30: warn (don't block) below 4.5:1; only hard-flag as "barely readable" below 2:1. */
export function checkTokenContrast(foreground: ColorToken, background: ColorToken): ContrastCheck {
  const ratio = contrastRatio(COLOR_TOKEN_HEX[foreground], COLOR_TOKEN_HEX[background]);
  return { ratio, passesAA: ratio >= 4.5, isUnreadable: ratio < 2 };
}

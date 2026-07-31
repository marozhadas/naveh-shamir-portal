import { TriangleAlert } from "lucide-react";
import { checkTokenContrast } from "@/editor/utils/check-contrast";
import type { ColorToken } from "@/editor/types/editor.types";
import styles from "./ContrastWarning.module.css";

type ContrastWarningProps = {
  foreground: ColorToken;
  background: ColorToken;
};

/** Non-blocking hint (spec section 30): shown below 4.5:1, phrased more strongly below 2:1. Never prevents saving. */
export function ContrastWarning({ foreground, background }: ContrastWarningProps) {
  const { ratio, passesAA, isUnreadable } = checkTokenContrast(foreground, background);
  if (passesAA) return null;

  return (
    <p className={`${styles.warning} ${isUnreadable ? styles.severe : ""}`} role="status">
      <TriangleAlert size={14} aria-hidden="true" />
      {isUnreadable
        ? `ניגודיות נמוכה מאוד (${ratio.toFixed(1)}:1) — הטקסט עלול להיות בלתי קריא כמעט לחלוטין.`
        : `ניגודיות נמוכה (${ratio.toFixed(1)}:1, מומלץ 4.5:1 ומעלה) — ייתכן שהטקסט יהיה קשה לקריאה.`}
    </p>
  );
}

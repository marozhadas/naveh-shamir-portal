"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { useEditor } from "@/editor/hooks/use-editor";
import { getEditableComponentEntry } from "@/editor/registry/editable-components-registry";
import type { HomeSectionId } from "@/editor/types/editor.types";
import styles from "./PageStructurePanel.module.css";

/**
 * The "מבנה העמוד" view (spec section 13/19): reorder and show/hide the four movable
 * homepage sections. Header/Hero/Footer never appear here — they're structural and always
 * shown, in a fixed position, by construction (they simply aren't part of `sectionsOrder`).
 */
export function PageStructurePanel() {
  const { state, reorderSections, setHiddenSections } = useEditor();
  const order = state.currentState.sectionsOrder;
  const hidden = new Set(state.currentState.hiddenSections);

  function moveBy(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    reorderSections(next);
  }

  function toggleHidden(sectionId: HomeSectionId) {
    const next = hidden.has(sectionId)
      ? [...hidden].filter((id) => id !== sectionId)
      : [...hidden, sectionId];
    setHiddenSections(next);
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        סדר והציגו/הסתירו את הסקשנים הניתנים להזזה בעמוד הבית. הכותרת העליונה, האזור הראשי והפוטר קבועים במקומם.
      </p>
      <ul className={styles.list}>
        <li className={styles.fixedRow}>כותרת עליונה (קבוע)</li>
        <li className={styles.fixedRow}>אזור ראשי — Hero (קבוע)</li>
        {order.map((sectionId, index) => {
          const entry = getEditableComponentEntry(`home.${sectionId}`);
          const isHidden = hidden.has(sectionId);
          return (
            <li key={sectionId} className={styles.row}>
              <span className={`${styles.label} ${isHidden ? styles.labelHidden : ""}`}>{entry.label}</span>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={index === 0}
                  aria-label={`הזזת ${entry.label} למעלה`}
                  onClick={() => moveBy(index, -1)}
                >
                  <ChevronUp size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={index === order.length - 1}
                  aria-label={`הזזת ${entry.label} למטה`}
                  onClick={() => moveBy(index, 1)}
                >
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-pressed={isHidden}
                  aria-label={isHidden ? `הצגת ${entry.label}` : `הסתרת ${entry.label}`}
                  onClick={() => toggleHidden(sectionId)}
                >
                  {isHidden ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </li>
          );
        })}
        <li className={styles.fixedRow}>פוטר (קבוע)</li>
      </ul>
    </div>
  );
}

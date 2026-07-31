"use client";

import { Eye, Monitor, RotateCcw, RotateCw, Smartphone, Tablet } from "lucide-react";
import { useEditorDispatch, useEditorState } from "@/editor/context/EditorContext";
import type { ViewportMode } from "@/editor/types/editor.types";
import styles from "./EditorToolbar.module.css";

export const VIEWPORT_WIDTHS: Record<ViewportMode, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

const VIEWPORT_OPTIONS: { mode: ViewportMode; label: string; icon: typeof Monitor }[] = [
  { mode: "desktop", label: "Desktop", icon: Monitor },
  { mode: "tablet", label: "Tablet", icon: Tablet },
  { mode: "mobile", label: "Mobile", icon: Smartphone },
];

export function EditorToolbar() {
  const { viewportMode, history, future } = useEditorState();
  const dispatch = useEditorDispatch();

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <div className={styles.undoRedoGroup} role="group" aria-label="בטל/בצע שוב">
          <button
            type="button"
            className={styles.iconButton}
            title="ביטול (Ctrl+Z)"
            aria-label="ביטול פעולה אחרונה"
            disabled={!canUndo}
            onClick={() => dispatch({ type: "UNDO" })}
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title="ביצוע שוב (Ctrl+Shift+Z)"
            aria-label="ביצוע שוב של פעולה שבוטלה"
            disabled={!canRedo}
            onClick={() => dispatch({ type: "REDO" })}
          >
            <RotateCw size={15} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className={styles.previewButton}
          onClick={() => dispatch({ type: "SET_PREVIEW_MODE", previewMode: true })}
        >
          <Eye size={15} aria-hidden="true" />
          תצוגה מקדימה
        </button>
      </div>

      <div className={styles.row}>
        <div className={styles.group} role="group" aria-label="בחירת תצוגת מסך">
          {VIEWPORT_OPTIONS.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              className={`${styles.button} ${viewportMode === mode ? styles.buttonActive : ""}`}
              aria-pressed={viewportMode === mode}
              onClick={() => dispatch({ type: "SET_VIEWPORT_MODE", viewportMode: mode })}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <span className={styles.width}>{VIEWPORT_WIDTHS[viewportMode]}px</span>
      </div>
    </div>
  );
}

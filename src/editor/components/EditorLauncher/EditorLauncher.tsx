"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEditorDispatch, useEditorState } from "@/editor/context/EditorContext";
import styles from "./EditorLauncher.module.css";

export function EditorLauncher() {
  const { editorOpen, previewMode } = useEditorState();
  const dispatch = useEditorDispatch();

  if (previewMode) {
    return (
      <button
        type="button"
        className={styles.exitPreview}
        onClick={() => dispatch({ type: "SET_PREVIEW_MODE", previewMode: false })}
      >
        <X size={18} aria-hidden="true" />
        יציאה מתצוגה מקדימה
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.launcher}
      title="פתיחת עורך"
      aria-label={editorOpen ? "סגירת עורך העיצוב" : "פתיחת עורך העיצוב"}
      aria-pressed={editorOpen}
      onClick={() => dispatch({ type: editorOpen ? "CLOSE_EDITOR" : "OPEN_EDITOR" })}
    >
      {editorOpen ? <X size={22} aria-hidden="true" /> : <SlidersHorizontal size={22} aria-hidden="true" />}
    </button>
  );
}

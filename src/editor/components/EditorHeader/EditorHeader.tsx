"use client";

import { X } from "lucide-react";
import { useEditorDispatch, useEditorState } from "@/editor/context/EditorContext";
import { getEditableComponentEntry } from "@/editor/registry/editable-components-registry";
import type { SavingStatus } from "@/editor/types/editor.types";
import styles from "./EditorHeader.module.css";

const STATUS_LABEL: Record<SavingStatus, string> = {
  idle: "טוען…",
  saved: "שמור",
  dirty: "שינויים שלא נשמרו",
  saving: "שומר…",
  error: "שגיאת שמירה",
};

const STATUS_CLASS: Record<SavingStatus, string> = {
  idle: styles.statusDotSaving,
  saved: styles.statusDotSaved,
  dirty: styles.statusDotDirty,
  saving: styles.statusDotSaving,
  error: styles.statusDotError,
};

export function EditorHeader() {
  const { selectedRegionId, savingStatus, persistedState } = useEditorState();
  const dispatch = useEditorDispatch();

  const entry = selectedRegionId ? getEditableComponentEntry(selectedRegionId) : null;
  const lastSavedLabel = persistedState.updatedAt
    ? new Date(persistedState.updatedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={styles.header}>
      <div className={styles.titles}>
        <div className={styles.breadcrumb}>
          <span>עמוד הבית</span>
          {entry && (
            <>
              <span aria-hidden="true">›</span>
              <span>{entry.label}</span>
            </>
          )}
        </div>
        <div className={styles.regionName}>{entry ? entry.label : "בחרו רכיב לעריכה"}</div>
        <div className={`${styles.status} ${STATUS_CLASS[savingStatus]}`} role="status" aria-live="polite">
          {STATUS_LABEL[savingStatus]}
        </div>
        {lastSavedLabel && <div className={styles.lastSaved}>נשמר לאחרונה בשעה {lastSavedLabel}</div>}
      </div>
      <button
        type="button"
        className={styles.closeButton}
        aria-label="סגירת עורך העיצוב"
        onClick={() => dispatch({ type: "CLOSE_EDITOR" })}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

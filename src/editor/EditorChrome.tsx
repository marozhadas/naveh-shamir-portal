"use client";

import { useEffect, useState } from "react";
import { useEditorState } from "@/editor/context/EditorContext";
import { useEditorKeyboardShortcuts } from "@/editor/utils/use-editor-keyboard-shortcuts";
import { EditorLauncher } from "@/editor/components/EditorLauncher/EditorLauncher";
import { EditorPanel } from "@/editor/components/EditorPanel/EditorPanel";
import { EditorToast } from "@/editor/components/EditorToast/EditorToast";
import type { EditorEvent } from "@/editor/types/editor.types";

const TOAST_DURATION_MS = 3000;

const EVENT_COPY: Record<EditorEvent["kind"], { message: string; tone: "success" | "error" }> = {
  saved: { message: "השינויים נשמרו", tone: "success" },
  reset: { message: "העמוד אופס לברירת המחדל", tone: "success" },
  "load-error": { message: "נתוני העורך לא היו תקינים ונטענו ברירות המחדל", tone: "error" },
  "save-error": { message: "לא ניתן היה לשמור את השינויים", tone: "error" },
};

export function EditorChrome() {
  const { editorOpen, previewMode, lastEvent } = useEditorState();
  useEditorKeyboardShortcuts();

  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  // Adjusting state during render (React-endorsed pattern for deriving state from a prop
  // transition) instead of an effect — lastEvent is a fresh object literal per dispatch, so
  // reference inequality reliably detects "a new event just happened", even for two saves in a row.
  const [lastSeenEvent, setLastSeenEvent] = useState<EditorEvent | null>(lastEvent);
  if (lastEvent !== lastSeenEvent) {
    setLastSeenEvent(lastEvent);
    if (lastEvent) {
      setToast(EVENT_COPY[lastEvent.kind]);
    }
  }

  useEffect(() => {
    if (!toast || toast.tone === "error") return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <EditorLauncher />
      {editorOpen && !previewMode && <EditorPanel />}
      {toast && <EditorToast message={toast.message} tone={toast.tone} />}
    </>
  );
}

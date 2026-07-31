"use client";

import { useEffect } from "react";
import { useEditorCommands, useEditorDispatch, useEditorState } from "@/editor/context/EditorContext";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function hasOpenDialog(): boolean {
  return document.querySelector("dialog[open]") !== null;
}

/**
 * Global shortcuts (spec section 27): E toggles the editor (only outside text
 * fields), Escape exits preview/closes the panel (deferring to a native
 * <dialog> if one is open), Ctrl/Cmd+S saves, Ctrl/Cmd+Z / Shift+Z undo/redo
 * (only outside text fields, so native input-level undo keeps working).
 */
export function useEditorKeyboardShortcuts() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const { saveNow } = useEditorCommands();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.ctrlKey || event.metaKey;

      if (event.key === "Escape") {
        if (hasOpenDialog()) return;
        if (state.previewMode) {
          dispatch({ type: "SET_PREVIEW_MODE", previewMode: false });
        } else if (state.editorOpen) {
          dispatch({ type: "CLOSE_EDITOR" });
        }
        return;
      }

      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (meta && !event.shiftKey && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
        event.preventDefault();
        dispatch({ type: event.key.toLowerCase() === "y" ? "REDO" : "UNDO" });
        return;
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      if (!meta && event.key.toLowerCase() === "e") {
        dispatch({ type: state.editorOpen ? "CLOSE_EDITOR" : "OPEN_EDITOR" });
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state.editorOpen, state.previewMode, dispatch, saveNow]);
}

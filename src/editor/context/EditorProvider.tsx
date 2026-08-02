"use client";

import { useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { createInitialEditorState, editorReducer } from "@/editor/state/editor-reducer";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";
import { defaultHomeEditorState } from "@/editor/config/editor-defaults";
import type { EditorStorageAdapter } from "@/editor/storage/editor-storage-adapter";
import { SupabaseEditorStorageAdapter } from "@/editor/storage/supabase-editor-storage-adapter";
import { cloneEditorState } from "@/editor/utils/clone-editor-state";
import { EditorCommandsContext, EditorDispatchContext, EditorStateContext, type EditorCommands } from "./EditorContext";

const AUTOSAVE_DEBOUNCE_MS = 1500;

type EditorProviderProps = {
  children: ReactNode;
  /** The real published content, already fetched server-side (page.tsx -> EditorHost -> EditorRuntime) — the editor starts from exactly what every other visitor already sees, never from a stale localStorage copy or hardcoded defaults. `null` means nothing has ever been published yet, which is the only case defaults are used. */
  initialContent: PageEditorState | null;
  storageAdapter?: EditorStorageAdapter;
};

export function EditorProvider({ children, initialContent, storageAdapter }: EditorProviderProps) {
  const adapter = useMemo(() => storageAdapter ?? new SupabaseEditorStorageAdapter(), [storageAdapter]);
  const [state, dispatch] = useReducer(editorReducer, initialContent, (content) => {
    const seed = cloneEditorState(content ?? defaultHomeEditorState);
    // Already know the real content synchronously (server-fetched in page.tsx) — no separate
    // load-on-mount round trip needed, and no "flash of defaults, then real content" gap.
    return { ...createInitialEditorState(seed), isLoaded: true };
  });

  // Managed autosave: debounced, only when there are unsaved changes.
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isDirty = state.currentState !== state.persistedState;
    if (!isDirty) return;

    const stateAtScheduleTime = state.currentState;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const nextState: PageEditorState = { ...stateAtScheduleTime, updatedAt: new Date().toISOString() };
      dispatch({ type: "SAVE_START" });
      try {
        await adapter.save(nextState);
        dispatch({ type: "SAVE_SUCCESS", state: nextState });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") console.error("[editor] autosave failed:", error);
        dispatch({ type: "SAVE_ERROR", message: "פרסום השינויים נכשל. נסו שוב." });
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [state.currentState, state.persistedState, adapter]);

  // Not memoized with useCallback: these close over the current `state` from this render,
  // which is exactly what a "save/reset right now" command should do. The few buttons that
  // consume EditorCommandsContext re-rendering on every edit is a non-issue at this scale.
  async function saveNow() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    // Stamped fresh on every save (spec: "updatedAt יתעדכן בעת שמירה") — dispatched back into both
    // currentState and persistedState (see SAVE_SUCCESS in the reducer) so they stay the same
    // reference and the dirty check doesn't misfire just because of the new timestamp.
    const nextState: PageEditorState = { ...state.currentState, updatedAt: new Date().toISOString() };
    dispatch({ type: "SAVE_START" });
    try {
      await adapter.save(nextState);
      dispatch({ type: "SAVE_SUCCESS", state: nextState });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("[editor] save failed:", error);
      dispatch({ type: "SAVE_ERROR", message: "פרסום השינויים נכשל. נסו שוב." });
    }
  }

  async function resetAll() {
    const resetState: PageEditorState = {
      ...cloneEditorState(defaultHomeEditorState),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: "RESET_ALL", defaultState: resetState });
    dispatch({ type: "SAVE_START" });
    try {
      await adapter.reset("home");
      dispatch({ type: "RESET_SUCCESS", state: resetState });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("[editor] reset failed:", error);
      dispatch({ type: "SAVE_ERROR", message: "איפוס ההגדרות נכשל. נסו שוב." });
    }
  }

  const commands: EditorCommands = { saveNow, resetAll };

  return (
    <EditorStateContext.Provider value={state}>
      <EditorDispatchContext.Provider value={dispatch}>
        <EditorCommandsContext.Provider value={commands}>{children}</EditorCommandsContext.Provider>
      </EditorDispatchContext.Provider>
    </EditorStateContext.Provider>
  );
}

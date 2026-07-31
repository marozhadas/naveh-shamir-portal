"use client";

import { useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { createInitialEditorState, editorReducer } from "@/editor/state/editor-reducer";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";
import { defaultHomeEditorState } from "@/editor/config/editor-defaults";
import type { EditorStorageAdapter } from "@/editor/storage/editor-storage-adapter";
import { LocalStorageEditorAdapter } from "@/editor/storage/local-storage-editor-adapter";
import { cloneEditorState } from "@/editor/utils/clone-editor-state";
import { EditorCommandsContext, EditorDispatchContext, EditorStateContext, type EditorCommands } from "./EditorContext";

const AUTOSAVE_DEBOUNCE_MS = 1500;

type EditorProviderProps = {
  children: ReactNode;
  storageAdapter?: EditorStorageAdapter;
};

export function EditorProvider({ children, storageAdapter }: EditorProviderProps) {
  const adapter = useMemo(() => storageAdapter ?? new LocalStorageEditorAdapter(), [storageAdapter]);
  const [state, dispatch] = useReducer(editorReducer, defaultHomeEditorState, (defaults) =>
    createInitialEditorState(cloneEditorState(defaults)),
  );

  // Load persisted state once on mount.
  useEffect(() => {
    let cancelled = false;

    adapter
      .load("home")
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) {
          dispatch({ type: "LOAD_STATE_SUCCESS", state: loaded });
        } else {
          dispatch({ type: "LOAD_STATE_SUCCESS", state: cloneEditorState(defaultHomeEditorState) });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (process.env.NODE_ENV !== "production") console.error("[editor] failed to load saved state:", error);
        dispatch({
          type: "LOAD_STATE_FAILED",
          state: cloneEditorState(defaultHomeEditorState),
          message: "נתוני העורך לא היו תקינים ונטענו ברירות המחדל.",
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Managed autosave: debounced, only after the initial load completed and only when there are unsaved changes.
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.isLoaded) return;
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
        dispatch({ type: "SAVE_ERROR", message: "שמירת ההגדרות נכשלה. נסו שוב." });
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [state.currentState, state.persistedState, state.isLoaded, adapter]);

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
      dispatch({ type: "SAVE_ERROR", message: "שמירת ההגדרות נכשלה. נסו שוב." });
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

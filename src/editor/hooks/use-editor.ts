"use client";

import { useEffect, useRef } from "react";
import { useEditorCommands, useEditorDispatch, useEditorState } from "@/editor/context/EditorContext";
import type { SectionKey } from "@/editor/state/editor-actions";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";
import type { HomeRegionId, HomeSectionId, ViewportMode } from "@/editor/types/editor.types";

const DEBOUNCE_MS = 500;

/**
 * The consolidated editor API. Internally this is a thin wrapper over the
 * state/dispatch/commands contexts (kept split for render-scoping reasons —
 * see EditorProvider) — most consumers should reach for this hook rather
 * than the individual context hooks directly.
 */
export function useEditor() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const { saveNow, resetAll } = useEditorCommands();

  // History policy (spec section 7): every meaningful change becomes one undo step, but
  // continuous typing must not spam one entry per keystroke. `updateSection`'s debounced
  // mode coalesces a burst of calls into a single entry, captured from the state as it was
  // BEFORE the first call in that burst — reading `state.currentState` here, in this render's
  // closure, before the dispatch below runs, is what makes that "before" snapshot correct.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstBaselineRef = useRef<PageEditorState | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return {
    state,
    selectRegion(regionId: HomeRegionId | null) {
      dispatch({ type: "SELECT_REGION", regionId });
    },
    hoverRegion(regionId: HomeRegionId | null) {
      dispatch({ type: "HOVER_REGION", regionId });
    },
    /**
     * `mode: "immediate"` (default) — for discrete controls (toggles, selects, token
     * pickers): each call is already one deliberate action, so it commits its own undo step
     * right away. `mode: "debounced"` — for free-text fields: rapid-fire calls coalesce into
     * one undo step ~500ms after the last call.
     */
    updateSection<K extends SectionKey>(
      section: K,
      settings: PageEditorState["sections"][K],
      mode: "immediate" | "debounced" = "immediate",
    ) {
      if (mode === "immediate") {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        const baseline = burstBaselineRef.current ?? state.currentState;
        burstBaselineRef.current = null;
        dispatch({ type: "SET_SECTION_SETTINGS", section, settings });
        dispatch({ type: "COMMIT_HISTORY_SNAPSHOT", snapshot: baseline });
        return;
      }

      if (burstBaselineRef.current === null) burstBaselineRef.current = state.currentState;
      dispatch({ type: "SET_SECTION_SETTINGS", section, settings });

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (burstBaselineRef.current) {
          dispatch({ type: "COMMIT_HISTORY_SNAPSHOT", snapshot: burstBaselineRef.current });
          burstBaselineRef.current = null;
        }
        debounceTimerRef.current = null;
      }, DEBOUNCE_MS);
    },
    undo() {
      dispatch({ type: "UNDO" });
    },
    redo() {
      dispatch({ type: "REDO" });
    },
    /** Reordering/hiding are each one deliberate action — commit their own undo step immediately, same as a discrete field change. */
    reorderSections(order: HomeSectionId[]) {
      const baseline = state.currentState;
      dispatch({ type: "REORDER_SECTIONS", order });
      dispatch({ type: "COMMIT_HISTORY_SNAPSHOT", snapshot: baseline });
    },
    setHiddenSections(hiddenSections: HomeSectionId[]) {
      const baseline = state.currentState;
      dispatch({ type: "SET_HIDDEN_SECTIONS", hiddenSections });
      dispatch({ type: "COMMIT_HISTORY_SNAPSHOT", snapshot: baseline });
    },
    /** RESET_SECTION pushes its own pre-change history snapshot internally (see the reducer). */
    resetSection<K extends SectionKey>(section: K, defaultSettings: PageEditorState["sections"][K]) {
      dispatch({ type: "RESET_SECTION", section, defaultSettings });
    },
    save: saveNow,
    reset: resetAll,
    setViewport(viewportMode: ViewportMode) {
      dispatch({ type: "SET_VIEWPORT_MODE", viewportMode });
    },
    enterPreview() {
      dispatch({ type: "SET_PREVIEW_MODE", previewMode: true });
    },
    exitPreview() {
      dispatch({ type: "SET_PREVIEW_MODE", previewMode: false });
    },
    openEditor() {
      dispatch({ type: "OPEN_EDITOR" });
    },
    closeEditor() {
      dispatch({ type: "CLOSE_EDITOR" });
    },
  };
}

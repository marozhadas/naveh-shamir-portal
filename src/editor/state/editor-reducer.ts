import type { EditorRuntimeState } from "@/editor/types/editor.types";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";
import type { EditorAction } from "./editor-actions";
import { pushHistorySnapshot, redoToNextSnapshot, undoToPreviousSnapshot } from "./editor-history";

export function createInitialEditorState(defaultState: PageEditorState): EditorRuntimeState {
  return {
    isLoaded: false,
    editorOpen: false,
    previewMode: false,
    viewportMode: "desktop",
    selectedRegionId: null,
    hoveredRegionId: null,
    currentState: defaultState,
    persistedState: defaultState,
    history: [],
    future: [],
    savingStatus: "idle",
    validationErrors: {},
    lastEvent: null,
  };
}

export function editorReducer(state: EditorRuntimeState, action: EditorAction): EditorRuntimeState {
  switch (action.type) {
    case "LOAD_STATE_SUCCESS":
      return {
        ...state,
        isLoaded: true,
        currentState: action.state,
        persistedState: action.state,
        savingStatus: "saved",
      };

    case "LOAD_STATE_FAILED":
      return {
        ...state,
        isLoaded: true,
        currentState: action.state,
        persistedState: action.state,
        savingStatus: "saved",
        lastEvent: { kind: "load-error", message: action.message },
      };

    case "OPEN_EDITOR":
      return { ...state, editorOpen: true };

    case "CLOSE_EDITOR":
      return { ...state, editorOpen: false };

    case "SET_PREVIEW_MODE":
      return { ...state, previewMode: action.previewMode };

    case "SET_VIEWPORT_MODE":
      return { ...state, viewportMode: action.viewportMode };

    case "SELECT_REGION":
      return { ...state, selectedRegionId: action.regionId };

    case "HOVER_REGION":
      return { ...state, hoveredRegionId: action.regionId };

    case "SET_SECTION_SETTINGS":
      return {
        ...state,
        savingStatus: "dirty",
        currentState: {
          ...state.currentState,
          sections: { ...state.currentState.sections, [action.section]: action.settings },
        },
      };

    case "COMMIT_HISTORY_SNAPSHOT": {
      // Pushes the caller-supplied (pre-change) snapshot — NOT state.currentState, which by
      // now already reflects the change. See useEditor().updateSection for why.
      const { history, future } = pushHistorySnapshot(
        { history: state.history, future: state.future },
        action.snapshot,
      );
      return { ...state, history, future };
    }

    case "REORDER_SECTIONS":
      return {
        ...state,
        savingStatus: "dirty",
        currentState: { ...state.currentState, sectionsOrder: action.order },
      };

    case "SET_HIDDEN_SECTIONS":
      return {
        ...state,
        savingStatus: "dirty",
        currentState: { ...state.currentState, hiddenSections: action.hiddenSections },
      };

    case "UNDO": {
      const result = undoToPreviousSnapshot({ history: state.history, future: state.future }, state.currentState);
      if (!result) return state;
      return {
        ...state,
        savingStatus: "dirty",
        currentState: result.snapshot,
        history: result.stacks.history,
        future: result.stacks.future,
      };
    }

    case "REDO": {
      const result = redoToNextSnapshot({ history: state.history, future: state.future }, state.currentState);
      if (!result) return state;
      return {
        ...state,
        savingStatus: "dirty",
        currentState: result.snapshot,
        history: result.stacks.history,
        future: result.stacks.future,
      };
    }

    case "RESET_SECTION": {
      const nextState: PageEditorState = {
        ...state.currentState,
        sections: { ...state.currentState.sections, [action.section]: action.defaultSettings },
      };
      const { history, future } = pushHistorySnapshot(
        { history: state.history, future: state.future },
        state.currentState,
      );
      return { ...state, savingStatus: "dirty", currentState: nextState, history, future };
    }

    case "RESET_ALL": {
      const { history, future } = pushHistorySnapshot(
        { history: state.history, future: state.future },
        state.currentState,
      );
      return { ...state, savingStatus: "dirty", currentState: action.defaultState, history, future };
    }

    case "SET_VALIDATION_ERRORS":
      return { ...state, validationErrors: { ...state.validationErrors, [action.scope]: action.errors } };

    case "CLEAR_VALIDATION_ERRORS": {
      const next = { ...state.validationErrors };
      delete next[action.scope];
      return { ...state, validationErrors: next };
    }

    case "SAVE_START":
      return { ...state, savingStatus: "saving" };

    case "SAVE_SUCCESS":
      // Same object reference for both: keeps the dirty check (currentState !== persistedState) correct
      // after a save that only changed `updatedAt` — see EditorProvider.saveNow.
      return {
        ...state,
        savingStatus: "saved",
        currentState: action.state,
        persistedState: action.state,
        lastEvent: { kind: "saved" },
      };

    case "RESET_SUCCESS":
      return {
        ...state,
        savingStatus: "saved",
        currentState: action.state,
        persistedState: action.state,
        lastEvent: { kind: "reset" },
      };

    case "SAVE_ERROR":
      return {
        ...state,
        savingStatus: "error",
        lastEvent: { kind: "save-error", message: action.message },
      };

    default:
      return state;
  }
}

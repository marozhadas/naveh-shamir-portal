import { createContext, useContext, type Dispatch } from "react";
import type { EditorAction } from "@/editor/state/editor-actions";
import type { EditorRuntimeState } from "@/editor/types/editor.types";

/**
 * Deliberately separate from EditorProvider.tsx (which pulls in the full
 * schemas/registry/defaults dependency chain to build its initial state).
 * This module only defines the contexts and their accessor hooks, so
 * always-mounted consumers — EditableRegion, useResolvedSectionSettings —
 * can import just this, and stay a near-zero-cost passthrough for every
 * visitor when Editor Mode is off. Only import type is used everywhere
 * above, so none of it survives into the compiled output either.
 */

export const EditorStateContext = createContext<EditorRuntimeState | null>(null);
export const EditorDispatchContext = createContext<Dispatch<EditorAction> | null>(null);

export type EditorCommands = {
  saveNow: () => Promise<void>;
  resetAll: () => Promise<void>;
};

export const EditorCommandsContext = createContext<EditorCommands | null>(null);

export function useEditorState(): EditorRuntimeState {
  const context = useContext(EditorStateContext);
  if (!context) throw new Error("useEditorState must be used within an EditorProvider");
  return context;
}

export function useEditorDispatch(): Dispatch<EditorAction> {
  const context = useContext(EditorDispatchContext);
  if (!context) throw new Error("useEditorDispatch must be used within an EditorProvider");
  return context;
}

/**
 * Non-throwing variants for components (like EditableRegion) that must keep
 * working — inert, with zero behavior — when rendered with no EditorProvider
 * ancestor at all, which is the normal case for every visitor when Editor
 * Mode is disabled.
 */
export function useOptionalEditorState(): EditorRuntimeState | null {
  return useContext(EditorStateContext);
}

export function useOptionalEditorDispatch(): Dispatch<EditorAction> | null {
  return useContext(EditorDispatchContext);
}

export function useEditorCommands(): EditorCommands {
  const context = useContext(EditorCommandsContext);
  if (!context) throw new Error("useEditorCommands must be used within an EditorProvider");
  return context;
}

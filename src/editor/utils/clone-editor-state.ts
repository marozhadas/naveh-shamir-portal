import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

/**
 * Deep-clones a PageEditorState. Used whenever `defaultHomeEditorState` (a
 * shared module-level constant) is about to become the new `currentState` —
 * e.g. on load-with-nothing-saved or on reset — so nothing ever holds a
 * reference into the shared default's nested objects/arrays.
 */
export function cloneEditorState(state: PageEditorState): PageEditorState {
  return structuredClone(state);
}

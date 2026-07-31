"use client";

import { useOptionalEditorState } from "@/editor/context/EditorContext";
import type { SectionKey } from "@/editor/state/editor-actions";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

/**
 * Resolves a section's settings: the live (possibly-unsaved) draft from the
 * editor when it's mounted, or `siteDefault` when it isn't (the normal case
 * for every visitor). This is what makes edits show up on the page instantly
 * — site components themselves never read editor state directly.
 */
export function useResolvedSectionSettings<K extends SectionKey>(
  section: K,
  siteDefault: PageEditorState["sections"][K],
): PageEditorState["sections"][K] {
  const state = useOptionalEditorState();
  return state ? state.currentState.sections[section] : siteDefault;
}

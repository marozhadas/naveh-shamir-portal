"use client";

import { useOptionalEditorState } from "@/editor/context/EditorContext";
import { usePublishedContent } from "@/editor/context/PublishedContentContext";
import type { SectionKey } from "@/editor/state/editor-actions";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

/**
 * Resolves a section's settings, in order:
 * 1. The live (possibly-unsaved) in-progress draft from the editor, when it's mounted (Editor
 *    Mode is genuinely open) — so typing in a field updates the preview instantly.
 * 2. The real published content (server-fetched once in page.tsx, the same content every visitor
 *    gets) — the normal case for every visitor, and also what the editor itself starts from
 *    before any local edits are made.
 * 3. `siteDefault` only as the last resort, when nothing has ever been published at all.
 *
 * Site components never read editor state directly, and — just as importantly — never read a
 * hardcoded default as if it were live data once real content has been published.
 */
export function useResolvedSectionSettings<K extends SectionKey>(
  section: K,
  siteDefault: PageEditorState["sections"][K],
): PageEditorState["sections"][K] {
  const editorState = useOptionalEditorState();
  const published = usePublishedContent();
  if (editorState) return editorState.currentState.sections[section];
  return published ? published.sections[section] : siteDefault;
}

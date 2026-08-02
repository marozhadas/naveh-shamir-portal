import { createContext, useContext } from "react";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

/**
 * Deliberately separate from EditorContext.ts (the interactive editor's state) and kept trivial —
 * no schemas/reducer/history — so it stays a near-zero-cost, always-mounted provider for every
 * visitor, not just when Editor Mode is on. This is what lets useResolvedSectionSettings() fall
 * back to real published content (server-fetched, shared) instead of a hardcoded default when no
 * EditorProvider is mounted.
 */
export const PublishedContentContext = createContext<PageEditorState | null>(null);

export function usePublishedContent(): PageEditorState | null {
  return useContext(PublishedContentContext);
}

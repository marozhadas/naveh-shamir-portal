"use client";

import type { ReactNode } from "react";
import { PublishedContentContext } from "@/editor/context/PublishedContentContext";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

type PublishedContentProviderProps = {
  content: PageEditorState | null;
  children: ReactNode;
};

/**
 * Always mounted around the homepage tree (both with and without ?editor=true) — this is what
 * makes the public site and the editor read from the same source. `content` is fetched once,
 * server-side, in page.tsx (see getPublishedPageContent()); this component just makes it
 * available to useResolvedSectionSettings() without pulling in the heavy editor bundle.
 */
export function PublishedContentProvider({ content, children }: PublishedContentProviderProps) {
  return <PublishedContentContext.Provider value={content}>{children}</PublishedContentContext.Provider>;
}

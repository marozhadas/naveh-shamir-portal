"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { PublishedContentProvider } from "./PublishedContentProvider";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

const EditorRuntime = dynamic(() => import("./EditorRuntime"), { ssr: false });

type EditorHostProps = {
  children: ReactNode;
  enabled: boolean;
  /** Server-fetched once in page.tsx (getPublishedPageContent) — the same content every visitor gets, editor open or not. `null` means nothing has ever been published yet. */
  publishedContent: PageEditorState | null;
};

/**
 * Wraps the homepage content. `publishedContent` is always threaded through via
 * PublishedContentProvider — a trivial, always-mounted context — regardless of whether Editor
 * Mode's interactive UI is on, so the public site and the editor read from the exact same source.
 * `enabled` only controls whether the heavier interactive editor chrome (EditorRuntime: schemas,
 * reducer, undo/redo, panels) is dynamically loaded on top of that — it never changes which
 * content is shown.
 *
 * `enabled` is computed once, server-side, in page.tsx via isEditorEnabled() — NOT via
 * useSearchParams here. Reading the query param client-side would require wrapping all this
 * content in a Suspense boundary, which would blank out the whole homepage until hydration
 * resolves it. A plain prop keeps the page fully server-rendered with content visible immediately.
 *
 * Wrapped in EditorErrorBoundary so a failed dynamic import (chunk load error, a bug in
 * EditorRuntime, ...) never takes the rest of the page down with it — the admin who opened
 * ?editor=true sees an explicit failure banner instead of a silent no-op or a blank page, and
 * everyone else's content still renders normally underneath it.
 */
export function EditorHost({ children, enabled, publishedContent }: EditorHostProps) {
  if (!enabled) {
    return <PublishedContentProvider content={publishedContent}>{children}</PublishedContentProvider>;
  }

  return (
    <PublishedContentProvider content={publishedContent}>
      <EditorErrorBoundary fallback={children}>
        <EditorRuntime initialContent={publishedContent}>{children}</EditorRuntime>
      </EditorErrorBoundary>
    </PublishedContentProvider>
  );
}

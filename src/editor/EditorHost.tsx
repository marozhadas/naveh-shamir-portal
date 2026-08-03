"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { PublishedContentProvider } from "./PublishedContentProvider";
import { isEditorEnabled } from "./config/editor-capabilities";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

const EditorRuntime = dynamic(() => import("./EditorRuntime"), { ssr: false });

type EditorHostProps = {
  children: ReactNode;
  /** Server-verified once in the root layout (isAdminAuthenticated) — never trust a client flag for this. */
  isAdmin: boolean;
  /** Server-fetched once in the root layout (getPublishedPageContent) — the same content every visitor gets, editor open or not. `null` means nothing has ever been published yet. */
  publishedContent: PageEditorState | null;
};

/**
 * Wraps every page (mounted in the root layout) so the floating editor launcher is reachable from
 * any route, not just "/". `publishedContent` is always threaded through via PublishedContentProvider
 * — a trivial, always-mounted context — regardless of whether Editor Mode's interactive UI is on,
 * so the public site and the editor read from the exact same source. `enabled` only controls whether
 * the heavier interactive editor chrome (EditorRuntime: schemas, reducer, undo/redo, panels) is
 * dynamically loaded on top of that — it never changes which content is shown.
 *
 * The root layout has no access to searchParams (Next.js only passes that to page.tsx), so
 * `?editor=true` is read client-side after mount instead — `enabled` starts `false` to match the
 * server-rendered HTML exactly (no hydration mismatch), then flips true in an effect if the query
 * param + isAdmin allow it. This trades a one-tick delay before the launcher appears for editor
 * availability on every route.
 *
 * Wrapped in EditorErrorBoundary so a failed dynamic import (chunk load error, a bug in
 * EditorRuntime, ...) never takes the rest of the page down with it — the admin who opened
 * ?editor=true sees an explicit failure banner instead of a silent no-op or a blank page, and
 * everyone else's content still renders normally underneath it.
 */
export function EditorHost({ children, isAdmin, publishedContent }: EditorHostProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of window.location (an external source), not a prop/state sync
    setEnabled(isEditorEnabled(new URLSearchParams(window.location.search), isAdmin));
  }, [isAdmin]);

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

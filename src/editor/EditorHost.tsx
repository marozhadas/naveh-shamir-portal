"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { EditorErrorBoundary } from "./EditorErrorBoundary";

const EditorRuntime = dynamic(() => import("./EditorRuntime"), { ssr: false });

type EditorHostProps = {
  children: ReactNode;
  enabled: boolean;
};

/**
 * Wraps the homepage content. When Editor Mode is disabled (the normal case
 * for every visitor), it's a pure passthrough — no dynamic import is even
 * triggered, so none of the editor code reaches the network or the bundle.
 * When enabled, it lazily mounts EditorRuntime (EditorProvider + the panel
 * UI) around the same children, so EditableRegion's context lookups resolve.
 *
 * `enabled` is computed once, server-side, in page.tsx via isEditorEnabled()
 * — NOT via useSearchParams here. Reading the query param client-side would
 * require wrapping all this content in a Suspense boundary, which would blank
 * out the whole homepage until hydration resolves it. A plain prop keeps the
 * page fully server-rendered with content visible immediately.
 *
 * Wrapped in EditorErrorBoundary so a failed dynamic import (chunk load
 * error, a bug in EditorRuntime, ...) never takes the rest of the page down
 * with it — the admin who opened ?editor=true sees an explicit failure
 * banner instead of a silent no-op or a blank page, and everyone else's
 * content still renders normally underneath it.
 */
export function EditorHost({ children, enabled }: EditorHostProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <EditorErrorBoundary fallback={children}>
      <EditorRuntime>{children}</EditorRuntime>
    </EditorErrorBoundary>
  );
}

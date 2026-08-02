"use client";

import type { ReactNode } from "react";
import { EditorProvider } from "@/editor/context/EditorProvider";
import { EditorChrome } from "@/editor/EditorChrome";
import { EditorViewportFrame } from "@/editor/components/EditorViewportFrame/EditorViewportFrame";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

type EditorRuntimeProps = {
  children: ReactNode;
  /** The same server-fetched published content page.tsx already resolved — passed straight through so EditorProvider doesn't need a redundant client-side fetch just to show what's already known. */
  initialContent: PageEditorState | null;
};

/**
 * The single entry point the homepage dynamically imports when Editor Mode
 * is enabled (see isEditorEnabled()). Everything heavy — zod schemas, the
 * registry, default settings, the panel UI — lives behind this one dynamic
 * import, so none of it reaches the bundle for a regular visitor.
 *
 * It wraps `children` (the EditableRegion-wrapped homepage sections) rather
 * than rendering alongside them, because EditableRegion reads EditorProvider's
 * React Context — a provider mounted as a sibling would never reach it.
 */
export default function EditorRuntime({ children, initialContent }: EditorRuntimeProps) {
  return (
    <EditorProvider initialContent={initialContent}>
      <EditorViewportFrame>{children}</EditorViewportFrame>
      <EditorChrome />
    </EditorProvider>
  );
}

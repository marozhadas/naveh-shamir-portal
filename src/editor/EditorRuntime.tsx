"use client";

import type { ReactNode } from "react";
import { EditorProvider } from "@/editor/context/EditorProvider";
import { EditorChrome } from "@/editor/EditorChrome";
import { EditorViewportFrame } from "@/editor/components/EditorViewportFrame/EditorViewportFrame";

type EditorRuntimeProps = {
  children: ReactNode;
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
export default function EditorRuntime({ children }: EditorRuntimeProps) {
  return (
    <EditorProvider>
      <EditorViewportFrame>{children}</EditorViewportFrame>
      <EditorChrome />
    </EditorProvider>
  );
}

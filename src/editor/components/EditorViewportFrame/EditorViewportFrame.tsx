"use client";

import type { ReactNode } from "react";
import { useEditorState } from "@/editor/context/EditorContext";
import { VIEWPORT_WIDTHS } from "@/editor/components/EditorToolbar/EditorToolbar";
import styles from "./EditorViewportFrame.module.css";

type EditorViewportFrameProps = {
  children: ReactNode;
};

/**
 * Architecture decision (spec section 16): a wrapping <div style="max-width">
 * around `children` would NOT actually trigger the site's real `@media`
 * queries — those respond to the browser's actual viewport, not an ancestor
 * element's width, and this page isn't (and shouldn't become) built on CSS
 * Container Queries just to support a preview mode. An iframe genuinely has
 * its own viewport, so it's the only option that makes real media queries
 * respond correctly at 768px/375px. Trade-off, clearly scoped: the iframe
 * loads the plain saved page (no ?editor=, so no editor chrome loads inside
 * it) — it reflects the last SAVED state, not unsaved live edits, since
 * syncing an in-progress draft into a cross-document iframe would need a
 * postMessage bridge, which is out of scope for this phase.
 */
export function EditorViewportFrame({ children }: EditorViewportFrameProps) {
  const { viewportMode } = useEditorState();

  if (viewportMode === "desktop") {
    return <>{children}</>;
  }

  const width = VIEWPORT_WIDTHS[viewportMode];
  const src = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <>
      <div className={styles.note} role="status">
        תצוגת {viewportMode === "tablet" ? "Tablet" : "Mobile"} ({width}px) — משקפת את הגרסה השמורה האחרונה
      </div>
      <div className={styles.frameWrap}>
        <iframe
          key={viewportMode}
          title={`תצוגה מקדימה — ${viewportMode}`}
          src={src}
          className={styles.frame}
          style={{ width }}
        />
      </div>
      <div className={styles.hiddenLive}>{children}</div>
    </>
  );
}

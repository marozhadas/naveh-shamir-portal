"use client";

import { Component, type ReactNode } from "react";
import styles from "./EditorErrorBoundary.module.css";

type EditorErrorBoundaryProps = {
  /** What to render instead of the editor if it fails — normally the same plain page content EditorHost would show with the editor off, so a failed editor never takes the whole site down with it. */
  fallback: ReactNode;
  children: ReactNode;
};

type EditorErrorBoundaryState = { hasError: boolean };

/**
 * Only an admin who explicitly opened ?editor=true ever sees this — a silent failure there would
 * look like the button/query param just did nothing, with no way to tell whether that's expected
 * or broken. React error boundaries must be class components; there's no hook equivalent for
 * catching render/lazy-import errors from children.
 */
export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  state: EditorErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[EditorErrorBoundary] הטעינה של העורך החזותי נכשלה:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <div className={styles.banner} role="alert">
            העורך החזותי נכשל בטעינה. הדף מוצג במצב רגיל (ללא העורך). נסו לרענן את העמוד; אם הבעיה
            נמשכת, פנו לתמיכה הטכנית.
          </div>
          {this.props.fallback}
        </>
      );
    }
    return this.props.children;
  }
}

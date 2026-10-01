import { createContext, useContext } from "react";
import type { HeaderViewer } from "@/lib/header-viewer";

/**
 * Deliberately trivial, same shape as PublishedContentContext — a near-zero-cost, always-mounted
 * provider fed by one server-side read in the root layout (getHeaderViewerDisplay), never
 * re-fetched per page. `null` means no real Supabase Auth session (signed out, or only the demo
 * viewer-switcher cookie — that never counts as a real identity here).
 */
export const HeaderViewerContext = createContext<HeaderViewer | null>(null);

export function useHeaderViewer(): HeaderViewer | null {
  return useContext(HeaderViewerContext);
}

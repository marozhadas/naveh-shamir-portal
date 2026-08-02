import type { EditorStorageAdapter } from "./editor-storage-adapter";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";
import { getPageContentAction, resetPageContentAction, savePageContentAction } from "@/editor/actions/site-content-actions";

/**
 * Replaces LocalStorageEditorAdapter as EditorProvider's default (see the create_site_content_pages
 * migration + site-content-actions.ts) — content now lives in Supabase, read by the public site and
 * the editor alike, instead of a per-browser localStorage copy only the editing admin's own browser
 * ever saw. Server Actions are plain async functions from a Client Component's point of view, so
 * this adapter is just a thin wrapper matching the existing EditorStorageAdapter interface.
 */
export class SupabaseEditorStorageAdapter implements EditorStorageAdapter {
  async load(pageId: string): Promise<PageEditorState | null> {
    return getPageContentAction(pageId);
  }

  async save(state: PageEditorState): Promise<void> {
    const result = await savePageContentAction(state.pageId, state);
    if (!result.success) throw new Error(result.message ?? "Failed to publish content.");
  }

  async reset(pageId: string): Promise<void> {
    const result = await resetPageContentAction(pageId);
    if (!result.success) throw new Error(result.message ?? "Failed to reset content.");
  }
}

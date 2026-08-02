import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { pageEditorStateSchema, type PageEditorState } from "@/editor/schemas/page-editor.schema";
import { migrateEditorStateIfNeeded } from "@/editor/storage/migrate-editor-state";
import { defaultHomeEditorState } from "@/editor/config/editor-defaults";

/**
 * The single source of truth for homepage content — read by the public site render AND by the
 * floating editor's initial load. Neither one reads from anywhere else (no localStorage, no
 * hardcoded defaults used as if they were live data): a visitor with no ?editor=true and an admin
 * with the editor open both call this exact function. Falls back to null (never throws) so the
 * caller can fall back to defaultHomeEditorState — the only place defaults are allowed to apply is
 * "nothing has ever been published yet", never "overwrite what's already published".
 */
export async function getPublishedPageContent(pageId: string): Promise<PageEditorState | null> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("site_content_pages").select("content").eq("page_id", pageId).maybeSingle();
    if (error || !data) return null;

    const migrated = migrateEditorStateIfNeeded(data.content, defaultHomeEditorState);
    const result = pageEditorStateSchema.safeParse(migrated);
    if (!result.success) {
      console.error(`[getPublishedPageContent] stored content for "${pageId}" failed validation:`, result.error.issues);
      return null;
    }
    return result.data;
  } catch (error) {
    console.error("[getPublishedPageContent] failed:", error);
    return null;
  }
}

/** Admin-only — caller (savePageContentAction) verifies isAdminAuthenticated() before this runs. */
export async function savePublishedPageContent(pageId: string, content: PageEditorState): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("site_content_pages")
    .upsert({ page_id: pageId, content, updated_at: new Date().toISOString() }, { onConflict: "page_id" });
  if (error) {
    console.error("[savePublishedPageContent] failed:", error.message);
    return false;
  }
  return true;
}

/** Admin-only, same contract. Deletes the row rather than writing defaults back — "nothing published" and "published, and it happens to equal the defaults" are different states, and only the former should mean getPublishedPageContent() returns null. */
export async function resetPublishedPageContent(pageId: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("site_content_pages").delete().eq("page_id", pageId);
  if (error) {
    console.error("[resetPublishedPageContent] failed:", error.message);
    return false;
  }
  return true;
}

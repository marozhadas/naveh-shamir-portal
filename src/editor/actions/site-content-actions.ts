"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getPublishedPageContent, resetPublishedPageContent, savePublishedPageContent } from "@/repositories/site-content-service";
import { pageEditorStateSchema, type PageEditorState } from "@/editor/schemas/page-editor.schema";

/** Public data (identical to what every visitor's homepage render already sees) — used by the editor's initial load, not admin-gated. */
export async function getPageContentAction(pageId: string): Promise<PageEditorState | null> {
  return getPublishedPageContent(pageId);
}

export type SavePageContentResult = { success: boolean; message?: string };

/** Publishes immediately and live for every visitor — there is no separate draft/published split in this system (spec: "if not needed, the save action publishes right away"). */
export async function savePageContentAction(pageId: string, content: unknown): Promise<SavePageContentResult> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, message: "יש להתחבר כאדמין כדי לפרסם שינויים." };
  }

  // Never trust the client's shape, even though it's the same admin who's authorized to write —
  // a stale client bundle or a bug in the editor's own state could otherwise write invalid data
  // that every future visitor's page render would then have to survive.
  const validated = pageEditorStateSchema.safeParse(content);
  if (!validated.success) {
    console.error("[savePageContentAction] rejected invalid content:", validated.error.issues);
    return { success: false, message: "מבנה התוכן אינו תקין. נסו לרענן את העורך." };
  }

  const success = await savePublishedPageContent(pageId, validated.data);
  if (!success) return { success: false, message: "הפרסום נכשל. נסו שוב בעוד כמה רגעים." };

  revalidatePath("/");
  return { success: true };
}

export async function resetPageContentAction(pageId: string): Promise<SavePageContentResult> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, message: "יש להתחבר כאדמין כדי לאפס תוכן." };
  }
  const success = await resetPublishedPageContent(pageId);
  if (!success) return { success: false, message: "האיפוס נכשל. נסו שוב בעוד כמה רגעים." };

  revalidatePath("/");
  return { success: true };
}

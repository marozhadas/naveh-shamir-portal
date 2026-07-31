import type { EditorStorageAdapter } from "./editor-storage-adapter";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";
import { validateEditorState } from "@/editor/utils/validate-editor-state";
import { migrateEditorStateIfNeeded } from "./migrate-editor-state";
import { defaultHomeEditorState } from "@/editor/config/editor-defaults";

const STORAGE_KEY_PREFIX = "naveh-shamir-home-editor-v1";

function storageKeyFor(pageId: string): string {
  return `${STORAGE_KEY_PREFIX}:${pageId}`;
}

export class LocalStorageEditorAdapter implements EditorStorageAdapter {
  async load(pageId: string): Promise<PageEditorState | null> {
    if (typeof window === "undefined") return null;

    const raw = window.localStorage.getItem(storageKeyFor(pageId));
    // Genuinely nothing saved yet (first visit, or after a reset) — normal, silent case.
    if (!raw) return null;

    // Something WAS saved but isn't usable — the caller must treat this differently from
    // "nothing saved" (spec: show a warning, not a silent fallback). Throwing routes it into
    // EditorProvider's existing LOAD_STATE_FAILED / corrupt-data-toast path.
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Saved editor state for "${pageId}" is not valid JSON`, { cause: error });
    }

    const migrated = migrateEditorStateIfNeeded(parsedJson, defaultHomeEditorState);
    const result = validateEditorState(migrated);
    if (!result.valid) {
      throw new Error(`Saved editor state for "${pageId}" failed schema validation: ${result.errors.join("; ")}`);
    }
    return result.state;
  }

  async save(state: PageEditorState): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeyFor(state.pageId), JSON.stringify(state));
  }

  async reset(pageId: string): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(storageKeyFor(pageId));
  }
}

import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

/**
 * Storage abstraction so the editor UI never talks to localStorage (or any
 * future API) directly. Swap the implementation passed to EditorProvider to
 * move persistence to a real backend later without touching any component.
 */
export interface EditorStorageAdapter {
  load(pageId: string): Promise<PageEditorState | null>;
  save(state: PageEditorState): Promise<void>;
  reset(pageId: string): Promise<void>;
}

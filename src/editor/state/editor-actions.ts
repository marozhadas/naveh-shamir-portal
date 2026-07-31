import type { HomeRegionId, HomeSectionId, ViewportMode } from "@/editor/types/editor.types";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

export type SectionKey = keyof PageEditorState["sections"];

export type EditorAction =
  | { type: "LOAD_STATE_SUCCESS"; state: PageEditorState }
  | { type: "LOAD_STATE_FAILED"; state: PageEditorState; message: string }
  | { type: "OPEN_EDITOR" }
  | { type: "CLOSE_EDITOR" }
  | { type: "SET_PREVIEW_MODE"; previewMode: boolean }
  | { type: "SET_VIEWPORT_MODE"; viewportMode: ViewportMode }
  | { type: "SELECT_REGION"; regionId: HomeRegionId | null }
  | { type: "HOVER_REGION"; regionId: HomeRegionId | null }
  | { type: "SET_SECTION_SETTINGS"; section: SectionKey; settings: PageEditorState["sections"][SectionKey] }
  | { type: "COMMIT_HISTORY_SNAPSHOT"; snapshot: PageEditorState }
  | { type: "REORDER_SECTIONS"; order: HomeSectionId[] }
  | { type: "SET_HIDDEN_SECTIONS"; hiddenSections: HomeSectionId[] }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET_SECTION"; section: SectionKey; defaultSettings: PageEditorState["sections"][SectionKey] }
  | { type: "RESET_ALL"; defaultState: PageEditorState }
  | { type: "SET_VALIDATION_ERRORS"; scope: string; errors: string[] }
  | { type: "CLEAR_VALIDATION_ERRORS"; scope: string }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; state: PageEditorState }
  | { type: "RESET_SUCCESS"; state: PageEditorState }
  | { type: "SAVE_ERROR"; message: string };

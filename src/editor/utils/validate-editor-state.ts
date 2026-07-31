import { pageEditorStateSchema } from "@/editor/schemas/page-editor.schema";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

export type EditorStateValidationResult =
  | { valid: true; state: PageEditorState }
  | { valid: false; errors: string[] };

/** Never trust raw JSON from storage — always run it through this before use. */
export function validateEditorState(candidate: unknown): EditorStateValidationResult {
  const result = pageEditorStateSchema.safeParse(candidate);
  if (result.success) {
    return { valid: true, state: result.data };
  }
  return { valid: false, errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
}

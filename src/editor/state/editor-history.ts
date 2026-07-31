import { HISTORY_LIMIT } from "@/editor/types/editor.types";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

export type HistoryStacks = {
  history: PageEditorState[];
  future: PageEditorState[];
};

/** Push `snapshot` onto history, capped at HISTORY_LIMIT, clearing redo. */
export function pushHistorySnapshot(stacks: HistoryStacks, snapshot: PageEditorState): HistoryStacks {
  const history = [...stacks.history, snapshot].slice(-HISTORY_LIMIT);
  return { history, future: [] };
}

/** Pop the most recent snapshot off history, pushing `current` onto future. Returns null if nothing to undo. */
export function undoToPreviousSnapshot(
  stacks: HistoryStacks,
  current: PageEditorState,
): { snapshot: PageEditorState; stacks: HistoryStacks } | null {
  if (stacks.history.length === 0) return null;
  const snapshot = stacks.history[stacks.history.length - 1];
  const history = stacks.history.slice(0, -1);
  const future = [current, ...stacks.future].slice(0, HISTORY_LIMIT);
  return { snapshot, stacks: { history, future } };
}

/** Pop the oldest future snapshot back in, pushing `current` onto history. Returns null if nothing to redo. */
export function redoToNextSnapshot(
  stacks: HistoryStacks,
  current: PageEditorState,
): { snapshot: PageEditorState; stacks: HistoryStacks } | null {
  if (stacks.future.length === 0) return null;
  const snapshot = stacks.future[0];
  const future = stacks.future.slice(1);
  const history = [...stacks.history, current].slice(-HISTORY_LIMIT);
  return { snapshot, stacks: { history, future } };
}

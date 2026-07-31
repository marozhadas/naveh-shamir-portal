import { useMemo } from "react";
import { useEditorState } from "@/editor/context/EditorContext";
import type { SectionKey } from "./editor-actions";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

export function useSectionSettings<K extends SectionKey>(section: K): PageEditorState["sections"][K] {
  const { currentState } = useEditorState();
  return currentState.sections[section] as PageEditorState["sections"][K];
}

export function useSectionsOrder() {
  const { currentState } = useEditorState();
  return currentState.sectionsOrder;
}

export function useCanUndo(): boolean {
  const { history } = useEditorState();
  return history.length > 0;
}

export function useCanRedo(): boolean {
  const { future } = useEditorState();
  return future.length > 0;
}

export function useIsRegionSelected(regionId: string): boolean {
  const { selectedRegionId } = useEditorState();
  return selectedRegionId === regionId;
}

export function useIsRegionHovered(regionId: string): boolean {
  const { hoveredRegionId } = useEditorState();
  return hoveredRegionId === regionId;
}

export function useHasValidationErrors(scope: string): boolean {
  const { validationErrors } = useEditorState();
  return useMemo(() => (validationErrors[scope]?.length ?? 0) > 0, [validationErrors, scope]);
}

"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useOptionalEditorDispatch, useOptionalEditorState } from "@/editor/context/EditorContext";
import type { HomeRegionId } from "@/editor/types/editor.types";
import styles from "./EditableRegion.module.css";

type EditableRegionProps = {
  id: HomeRegionId;
  label: string;
  children: ReactNode;
};

/**
 * Wraps every homepage section unconditionally (per the editor spec), but
 * stays a practically-zero-cost passthrough when no EditorProvider is
 * mounted (the normal case for every visitor when Editor Mode is off) —
 * it never imports the registry/schemas, so it doesn't pull the heavy
 * editor bundle in just by being present in the tree.
 */
export function EditableRegion({ id, label, children }: EditableRegionProps) {
  const state = useOptionalEditorState();
  const dispatch = useOptionalEditorDispatch();

  if (!state || !dispatch || !state.editorOpen || state.previewMode) {
    return <>{children}</>;
  }

  const isSelected = state.selectedRegionId === id;

  return (
    <div
      className={`${styles.wrapper} ${styles.interactive} ${isSelected ? styles.selected : ""}`}
      onClick={() => dispatch({ type: "SELECT_REGION", regionId: id })}
      onMouseEnter={() => dispatch({ type: "HOVER_REGION", regionId: id })}
      onMouseLeave={() => dispatch({ type: "HOVER_REGION", regionId: null })}
    >
      <button
        type="button"
        className={`${styles.label} ${isSelected ? styles.labelVisible : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          dispatch({ type: "SELECT_REGION", regionId: id });
        }}
      >
        <Pencil size={12} aria-hidden="true" />
        {label}
      </button>
      {children}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CategoryFilterList } from "@/components/business-archive/CategoryFilterList/CategoryFilterList";
import { filterBusinesses } from "@/utils/business-filters";
import type { Business } from "@/types/business";
import styles from "./MobileFiltersSheet.module.css";

type MobileFiltersSheetProps = {
  open: boolean;
  onClose: () => void;
  selectedCategoryIds: string[];
  onApply: (categoryIds: string[]) => void;
  counts: Record<string, number>;
  totalCount: number;
  /** Businesses already filtered by visibility + the active search query (not yet by category) — used to compute the live "הצגת X תוצאות" preview as the draft selection changes. */
  queryFilteredBusinesses: Business[];
};

/**
 * A native <dialog> (showModal/close), same pattern as EditorConfirmDialog — gets focus trap,
 * Escape-to-close and backdrop handling for free instead of reimplementing them. The user's
 * selection is a local draft: nothing is applied to the real filters until "הצגת X תוצאות".
 */
export function MobileFiltersSheet({
  open,
  onClose,
  selectedCategoryIds,
  onApply,
  counts,
  totalCount,
  queryFilteredBusinesses,
}: MobileFiltersSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draftCategoryIds, setDraftCategoryIds] = useState(selectedCategoryIds);

  // Reset the draft to the real selection every time the sheet opens (adjust-during-render,
  // not an effect: we want this to happen synchronously with the `open` transition).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setDraftCategoryIds(selectedCategoryIds);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const previewCount = filterBusinesses(queryFilteredBusinesses, {
    query: "",
    categoryIds: draftCategoryIds,
    sort: "featured",
  }).length;

  function handleApply() {
    onApply(draftCategoryIds);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="סינון עסקים"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>סינון עסקים</h2>
        <button type="button" className={styles.closeButton} aria-label="סגירת סינון" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.content}>
        <CategoryFilterList
          selectedCategoryIds={draftCategoryIds}
          onChange={setDraftCategoryIds}
          counts={counts}
          totalCount={totalCount}
        />
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={() => setDraftCategoryIds([])}>
          ניקוי
        </Button>
        <Button variant="primary" onClick={handleApply}>
          {previewCount === 1 ? "הצגת תוצאה אחת" : `הצגת ${previewCount} תוצאות`}
        </Button>
      </div>
    </dialog>
  );
}

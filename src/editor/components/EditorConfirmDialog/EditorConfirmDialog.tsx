"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./EditorConfirmDialog.module.css";

type EditorConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A genuine modal (native <dialog>, showModal()) — unlike the main editor
 * panel, this one SHOULD block background interaction: it's a destructive
 * confirmation (reset), not a live-preview side panel.
 */
export function EditorConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "ביטול",
  onConfirm,
  onCancel,
}: EditorConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClose={onCancel}
    >
      <div className={styles.body}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

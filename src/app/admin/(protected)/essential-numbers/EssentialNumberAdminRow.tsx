"use client";

import { useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ESSENTIAL_NUMBER_CATEGORY_LABEL, ESSENTIAL_NUMBER_STATUS_LABEL } from "@/types/essential-number";
import { ESSENTIAL_NUMBER_ICON_MAP } from "@/data/essential-number-icons";
import { ICON_TONE_VARS } from "@/utils/essential-number-icon-tone";
import { deleteEssentialNumberAction, duplicateEssentialNumberAction, moveEssentialNumberAction, setEssentialNumberStatusAction } from "./actions";
import type { EssentialNumberRow, EssentialNumberStatus } from "@/types/essential-number";
import styles from "./essential-numbers-admin.module.css";

type EssentialNumberAdminRowProps = {
  entry: EssentialNumberRow;
  onUpdated: (entry: EssentialNumberRow) => void;
  onDeleted: (id: string) => void;
  onDuplicated: (entry: EssentialNumberRow) => void;
  onMoved: (id: string, direction: "up" | "down") => void;
  canReorder: boolean;
  isFirst: boolean;
  isLast: boolean;
};

export function EssentialNumberAdminRow({ entry, onUpdated, onDeleted, onDuplicated, onMoved, canReorder, isFirst, isLast }: EssentialNumberAdminRowProps) {
  const [isPending, startTransition] = useTransition();
  const tone = ICON_TONE_VARS[entry.icon_tone];
  const Icon = entry.icon_type === "lucide" ? (ESSENTIAL_NUMBER_ICON_MAP[entry.icon_name ?? ""] ?? Phone) : null;

  function changeStatus(status: EssentialNumberStatus) {
    startTransition(async () => {
      await setEssentialNumberStatusAction(entry.id, status);
      onUpdated({ ...entry, status });
    });
  }

  function handleMove(direction: "up" | "down") {
    onMoved(entry.id, direction);
    startTransition(async () => {
      await moveEssentialNumberAction(entry.id, direction);
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const created = await duplicateEssentialNumberAction(entry.id);
      onDuplicated(created);
    });
  }

  function handleDelete() {
    if (!window.confirm(`למחוק לצמיתות את "${entry.name}"? פעולה זו אינה הפיכה.`)) return;
    startTransition(async () => {
      await deleteEssentialNumberAction(entry.id);
      onDeleted(entry.id);
    });
  }

  return (
    <div className={`${styles.row} ${styles[`status_${entry.status}`] ?? ""}`}>
      {canReorder && (
        <div className={styles.orderButtons}>
          <button type="button" className={styles.orderButton} disabled={isFirst || isPending} onClick={() => handleMove("up")} aria-label="העלה למעלה">
            <ArrowUp size={14} aria-hidden="true" />
          </button>
          <button type="button" className={styles.orderButton} disabled={isLast || isPending} onClick={() => handleMove("down")} aria-label="הורד למטה">
            <ArrowDown size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className={styles.rowIcon} style={{ background: tone.bg, color: tone.fg }} aria-hidden="true">
        {entry.icon_type === "custom-image" && entry.icon_url ? (
          <Image src={entry.icon_url} alt="" fill sizes="44px" className={styles.rowIconImage} />
        ) : (
          Icon && <Icon size={20} aria-hidden="true" />
        )}
      </div>

      <div className={styles.rowInfo}>
        <span className={styles.rowTitle}>
          {entry.name}
          {entry.featured && <span className={styles.featuredBadge}>★ מומלץ</span>}
        </span>
        <span className={styles.rowMeta}>
          {entry.display_phone} · {ESSENTIAL_NUMBER_CATEGORY_LABEL[entry.category]}
          {entry.opening_hours ? ` · ${entry.opening_hours}` : ""} · סדר: {entry.priority}
        </span>
      </div>

      <span className={styles.statusBadge}>{ESSENTIAL_NUMBER_STATUS_LABEL[entry.status]}</span>

      <div className={styles.rowActions}>
        <Button href={`/admin/essential-numbers/${entry.id}/edit`} variant="secondary" size="compact">
          עריכה
        </Button>
        {entry.status === "published" ? (
          <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("draft")}>
            הסתרה
          </Button>
        ) : (
          <Button variant="accent" size="compact" disabled={isPending} onClick={() => changeStatus("published")}>
            פרסום
          </Button>
        )}
        {entry.status !== "archived" && (
          <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("archived")}>
            ארכוב
          </Button>
        )}
        <Button variant="secondary" size="compact" disabled={isPending} onClick={handleDuplicate}>
          שכפול
        </Button>
        <Button variant="secondary" size="compact" disabled={isPending} onClick={handleDelete}>
          מחיקה
        </Button>
      </div>
    </div>
  );
}

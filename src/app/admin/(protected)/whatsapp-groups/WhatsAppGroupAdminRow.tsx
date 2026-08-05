"use client";

import { useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { WHATSAPP_GROUP_CATEGORY_LABEL, WHATSAPP_GROUP_STATUS_LABEL } from "@/types/whatsapp-group";
import { WHATSAPP_GROUP_ICON_MAP } from "@/data/whatsapp-group-icons";
import { deleteWhatsAppGroupAction, duplicateWhatsAppGroupAction, moveWhatsAppGroupAction, setWhatsAppGroupStatusAction } from "./actions";
import type { WhatsAppGroupRow, WhatsAppGroupStatus } from "@/types/whatsapp-group";
import styles from "./whatsapp-groups-admin.module.css";

type WhatsAppGroupAdminRowProps = {
  entry: WhatsAppGroupRow;
  onUpdated: (entry: WhatsAppGroupRow) => void;
  onDeleted: (id: string) => void;
  onDuplicated: (entry: WhatsAppGroupRow) => void;
  onMoved: (id: string, direction: "up" | "down") => void;
  canReorder: boolean;
  isFirst: boolean;
  isLast: boolean;
};

export function WhatsAppGroupAdminRow({ entry, onUpdated, onDeleted, onDuplicated, onMoved, canReorder, isFirst, isLast }: WhatsAppGroupAdminRowProps) {
  const [isPending, startTransition] = useTransition();
  const Icon = entry.icon_type === "lucide" ? (WHATSAPP_GROUP_ICON_MAP[entry.icon_name ?? ""] ?? null) : null;

  function changeStatus(status: WhatsAppGroupStatus) {
    startTransition(async () => {
      await setWhatsAppGroupStatusAction(entry.id, status);
      onUpdated({ ...entry, status });
    });
  }

  function handleMove(direction: "up" | "down") {
    onMoved(entry.id, direction);
    startTransition(async () => {
      await moveWhatsAppGroupAction(entry.id, direction);
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const created = await duplicateWhatsAppGroupAction(entry.id);
      onDuplicated(created);
    });
  }

  function handleDelete() {
    if (!window.confirm(`למחוק לצמיתות את "${entry.name}"? פעולה זו אינה הפיכה.`)) return;
    startTransition(async () => {
      await deleteWhatsAppGroupAction(entry.id);
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

      <div className={styles.rowIcon} aria-hidden="true">
        {entry.icon_type === "custom-image" && entry.icon_url ? (
          <Image src={entry.icon_url} alt="" fill sizes="44px" className={styles.rowIconImage} />
        ) : entry.icon_type === "lucide" && Icon ? (
          <Icon size={20} aria-hidden="true" />
        ) : (
          <WhatsAppIcon size={22} aria-hidden="true" />
        )}
      </div>

      <div className={styles.rowInfo}>
        <span className={styles.rowTitle}>
          {entry.name}
          {entry.featured && <span className={styles.featuredBadge}>★ מומלצת</span>}
        </span>
        <span className={styles.rowMeta}>
          {WHATSAPP_GROUP_CATEGORY_LABEL[entry.category]}
          {entry.area_or_street ? ` · ${entry.area_or_street}` : ""}
          {entry.audience.length > 0 ? ` · ${entry.audience.join(", ")}` : ""} · סדר: {entry.priority}
        </span>
      </div>

      <span className={styles.statusBadge}>{WHATSAPP_GROUP_STATUS_LABEL[entry.status]}</span>

      <div className={styles.rowActions}>
        <Button href={`/admin/whatsapp-groups/${entry.id}/edit`} variant="secondary" size="compact">
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

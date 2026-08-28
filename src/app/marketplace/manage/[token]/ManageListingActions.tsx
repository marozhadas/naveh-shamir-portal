"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateManagedListingStatusAction } from "./actions";
import type { MarketplaceListingRow, MarketplaceListingStatus } from "@/types/marketplace";
import styles from "./manage.module.css";

type ManageListingActionsProps = {
  token: string;
  listing: MarketplaceListingRow;
};

const CONFIRM_MESSAGE: Partial<Record<MarketplaceListingStatus, string>> = {
  sold: "האם לסמן את הפריט כנמכר?\n\nלאחר האישור המודעה תסומן כנמכר ולא תופיע בין הפריטים הזמינים.",
  delivered: "האם לסמן את הפריט כנמסר?\n\nלאחר האישור המודעה תסומן כנמסר ולא תופיע בין הפריטים הזמינים.",
  active: "האם להחזיר את המודעה לזמינה?",
};

/**
 * Status-gated action buttons for the poster's own management page — no login, just this page's
 * token. Confirmation is a plain window.confirm() (this project's established pattern for every
 * other destructive/status-changing admin action — see e.g. CommunityNewsAdminRow.tsx) rather than
 * a custom modal component, which doesn't otherwise exist in this codebase.
 */
export function ManageListingActions({ token, listing }: ManageListingActionsProps) {
  const [current, setCurrent] = useState(listing);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function changeStatus(nextStatus: MarketplaceListingStatus) {
    const message = CONFIRM_MESSAGE[nextStatus];
    if (message && !window.confirm(message)) return;

    setError("");
    startTransition(async () => {
      const result = await updateManagedListingStatusAction(token, nextStatus);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setCurrent(result.listing);
    });
  }

  return (
    <div className={styles.actionsWrap}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {current.status === "active" && (
        <div className={styles.actionButtons}>
          <Button variant="accent" disabled={isPending} onClick={() => changeStatus("sold")}>
            סימון כנמכר
          </Button>
          <Button variant="secondary" disabled={isPending} onClick={() => changeStatus("delivered")}>
            סימון כנמסר
          </Button>
        </div>
      )}

      {current.status === "sold" && (
        <>
          <p className={styles.statusMessage}>הפריט סומן כנמכר.</p>
          <Button variant="secondary" disabled={isPending} onClick={() => changeStatus("active")}>
            החזרה לזמין
          </Button>
        </>
      )}

      {current.status === "delivered" && (
        <>
          <p className={styles.statusMessage}>הפריט סומן כנמסר.</p>
          <Button variant="secondary" disabled={isPending} onClick={() => changeStatus("active")}>
            החזרה לזמין
          </Button>
        </>
      )}

      {(current.status === "pending" || current.status === "removed") && (
        <p className={styles.statusMessage}>
          {current.status === "pending" ? "המודעה עדיין ממתינה לאישור צוות הפורטל — אפשר יהיה לעדכן את הסטטוס לאחר שתאושר." : "המודעה הוסרה על ידי צוות הפורטל."}
        </p>
      )}
    </div>
  );
}

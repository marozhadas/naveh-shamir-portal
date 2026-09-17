"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { approveReviewAction, rejectReviewAction, deleteReviewAction } from "./actions";
import { BUSINESS_REVIEW_STATUS_LABEL } from "@/types/business-review";
import type { AdminReviewRow } from "@/lib/admin/business-reviews";
import styles from "./reviews-admin.module.css";

type ReviewAdminRowProps = {
  review: AdminReviewRow;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

export function ReviewAdminRow({ review: initialReview }: ReviewAdminRowProps) {
  const [isPending, startTransition] = useTransition();
  const [review, setReview] = useState(initialReview);
  const [isDeleted, setIsDeleted] = useState(false);

  function handleDelete() {
    if (!window.confirm(`למחוק את הביקורת של ${review.author_name} לצמיתות? לא ניתן לשחזר.`)) return;
    startTransition(async () => {
      await deleteReviewAction(review.id);
      setIsDeleted(true);
    });
  }

  if (isDeleted) return null;

  return (
    <div className={`${styles.wrap} ${styles[`status_${review.status}`] ?? ""}`}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardInfo}>
            <span className={styles.businessName}>{review.businessName}</span>
            <span className={styles.meta}>
              {review.author_name} · {formatDate(review.created_at)}
            </span>
          </div>
          <span className={styles.statusBadge}>{BUSINESS_REVIEW_STATUS_LABEL[review.status]}</span>
        </div>

        <p className={styles.content}>{review.content}</p>

        <div className={styles.cardActions}>
          {review.status === "pending" && (
            <>
              <Button
                variant="accent"
                size="compact"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await approveReviewAction(review.id);
                    setReview((current) => ({ ...current, status: "approved" }));
                  })
                }
              >
                אישור
              </Button>
              <Button
                variant="secondary"
                size="compact"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await rejectReviewAction(review.id);
                    setReview((current) => ({ ...current, status: "rejected" }));
                  })
                }
              >
                דחייה
              </Button>
            </>
          )}
          <Button variant="secondary" size="compact" disabled={isPending} onClick={handleDelete}>
            מחיקה
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { getMarketplaceCategoryLabel } from "@/data/marketplace-categories";
import { MARKETPLACE_STATUS_LABEL } from "@/types/marketplace";
import { approveMarketplaceListingAction, rejectMarketplaceListingAction, setMarketplaceListingStatusAction } from "./actions";
import type { MarketplaceListingRow, MarketplaceListingStatus } from "@/types/marketplace";
import styles from "./marketplace-admin.module.css";

const NEXT_STATUS_OPTIONS: MarketplaceListingStatus[] = ["active", "reserved", "delivered", "sold", "removed"];

type MarketplaceAdminRowProps = {
  listing: MarketplaceListingRow;
};

export function MarketplaceAdminRow({ listing }: MarketplaceAdminRowProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(listing.status);

  return (
    <div className={`${styles.card} ${styles[`status_${status}`] ?? ""}`}>
      <div className={styles.cardInfo}>
        <span className={styles.listingTitle}>{listing.title}</span>
        <span className={styles.meta}>
          {getMarketplaceCategoryLabel(listing.category_id) ?? listing.category_id} · {listing.contact_name}
          {listing.report_count > 0 && ` · דווחה ${listing.report_count} פעמים`}
        </span>
      </div>

      <span className={styles.statusBadge}>{MARKETPLACE_STATUS_LABEL[status]}</span>

      <div className={styles.cardActions}>
        {status === "pending" ? (
          <>
            <Button
              variant="accent"
              size="compact"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await approveMarketplaceListingAction(listing.id);
                  setStatus("active");
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
                  await rejectMarketplaceListingAction(listing.id);
                  setStatus("removed");
                })
              }
            >
              דחייה
            </Button>
          </>
        ) : (
          <select
            className={styles.statusSelect}
            value={status}
            disabled={isPending}
            onChange={(event) => {
              const next = event.target.value as MarketplaceListingStatus;
              startTransition(async () => {
                await setMarketplaceListingStatusAction(listing.id, next);
                setStatus(next);
              });
            }}
          >
            {NEXT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {MARKETPLACE_STATUS_LABEL[option]}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getMarketplaceCategoryLabel } from "@/data/marketplace-categories";
import { MARKETPLACE_STATUS_LABEL } from "@/types/marketplace";
import { approveMarketplaceListingAction, rejectMarketplaceListingAction, setMarketplaceListingStatusAction } from "./actions";
import { MarketplaceAdminDetail } from "./MarketplaceAdminDetail";
import type { MarketplaceListingRow, MarketplaceListingStatus } from "@/types/marketplace";
import styles from "./marketplace-admin.module.css";

const NEXT_STATUS_OPTIONS: MarketplaceListingStatus[] = ["active", "reserved", "delivered", "sold", "removed"];

type MarketplaceAdminRowProps = {
  listing: MarketplaceListingRow;
};

export function MarketplaceAdminRow({ listing: initialListing }: MarketplaceAdminRowProps) {
  const [isPending, startTransition] = useTransition();
  const [listing, setListing] = useState(initialListing);
  const [expanded, setExpanded] = useState(false);
  const status = listing.status;

  return (
    <div className={`${styles.wrap} ${styles[`status_${status}`] ?? ""}`}>
      <div className={styles.card}>
        <button
          type="button"
          className={styles.expandButton}
          aria-expanded={expanded}
          aria-label={expanded ? "הסתרת פרטים" : "צפייה בכל הפרטים"}
          onClick={() => setExpanded((current) => !current)}
        >
          <ChevronDown size={18} aria-hidden="true" className={expanded ? styles.chevronOpen : ""} />
        </button>

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
                    setListing((current) => ({ ...current, status: "active" }));
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
                    setListing((current) => ({ ...current, status: "removed" }));
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
                  setListing((current) => ({ ...current, status: next }));
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

      {expanded && <MarketplaceAdminDetail listing={listing} onSaved={setListing} />}
    </div>
  );
}

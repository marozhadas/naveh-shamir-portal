"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { reportMarketplaceListingAction } from "./actions";
import styles from "./listing.module.css";

type ReportListingButtonProps = {
  listingId: string;
};

export function ReportListingButton({ listingId }: ReportListingButtonProps) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  if (state === "sent") {
    return <p className={styles.reportSent}>הדיווח התקבל, תודה.</p>;
  }

  return (
    <button
      type="button"
      className={styles.reportButton}
      disabled={state === "sending"}
      onClick={async () => {
        setState("sending");
        await reportMarketplaceListingAction(listingId);
        setState("sent");
      }}
    >
      <Flag size={14} aria-hidden="true" />
      דיווח על מודעה
    </button>
  );
}

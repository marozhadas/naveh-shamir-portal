"use client";

import { useEffect } from "react";
import { BusinessesErrorState } from "@/components/business-archive/BusinessesErrorState/BusinessesErrorState";
import styles from "./businesses.module.css";

export default function BusinessesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error("[businesses page]", error);
  }, [error]);

  return (
    <div className={styles.container} style={{ paddingTop: "var(--space-8)" }}>
      <BusinessesErrorState onRetry={reset} />
    </div>
  );
}

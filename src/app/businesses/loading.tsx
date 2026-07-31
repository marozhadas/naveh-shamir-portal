import { BusinessesGridSkeleton } from "@/components/business-archive/BusinessesGridSkeleton/BusinessesGridSkeleton";
import styles from "./businesses.module.css";

/**
 * Next's route-level loading UI — in practice barely visible today since the demo data is
 * synchronous and local, but the boundary is in place for when this route fetches from an API.
 */
export default function BusinessesLoading() {
  return (
    <div className={styles.container} style={{ paddingTop: "var(--space-8)" }}>
      <BusinessesGridSkeleton />
    </div>
  );
}

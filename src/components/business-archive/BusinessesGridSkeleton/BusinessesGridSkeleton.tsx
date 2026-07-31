import { BusinessCardSkeleton } from "@/components/business-archive/BusinessCardSkeleton/BusinessCardSkeleton";
import styles from "./BusinessesGridSkeleton.module.css";

type BusinessesGridSkeletonProps = {
  count?: number;
};

export function BusinessesGridSkeleton({ count = 12 }: BusinessesGridSkeletonProps) {
  return (
    <div className={styles.grid} role="status" aria-label="טוען עסקים">
      {Array.from({ length: count }, (_, index) => (
        <BusinessCardSkeleton key={index} />
      ))}
    </div>
  );
}

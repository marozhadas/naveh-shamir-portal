import { Button } from "@/components/ui/Button";
import styles from "./LoadMoreButton.module.css";

type LoadMoreButtonProps = {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
};

export function LoadMoreButton({ visibleCount, totalCount, onLoadMore }: LoadMoreButtonProps) {
  if (visibleCount >= totalCount) return null;

  return (
    <div className={styles.wrap}>
      <p className={styles.progress}>{`מוצגים ${visibleCount} מתוך ${totalCount} עסקים`}</p>
      <Button variant="secondary" onClick={onLoadMore}>
        טעינת עסקים נוספים
      </Button>
    </div>
  );
}

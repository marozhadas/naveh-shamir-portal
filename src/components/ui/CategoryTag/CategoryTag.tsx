import type { BusinessCategory } from "@/types/business";
import styles from "./CategoryTag.module.css";

const CATEGORY_STYLE: Record<string, string> = {
  אוכל: styles.food,
  חוגים: styles.classes,
  'גמ"ח': styles.gemach,
};

type CategoryTagProps = {
  label: string;
  category?: BusinessCategory | string;
};

export function CategoryTag({ label, category }: CategoryTagProps) {
  const variantClass = CATEGORY_STYLE[category ?? label] ?? styles.default;

  return <span className={`${styles.tag} ${variantClass}`}>{label}</span>;
}

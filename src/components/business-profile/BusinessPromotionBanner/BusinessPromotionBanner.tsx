import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";
import type { BusinessPromotion } from "@/types/business";
import styles from "./BusinessPromotionBanner.module.css";

type BusinessPromotionBannerProps = {
  promotion: BusinessPromotion | undefined;
};

/** Renders nothing at all (not an empty section) unless the promotion is visible, has a title, and hasn't expired — spec section 16. */
export function BusinessPromotionBanner({ promotion }: BusinessPromotionBannerProps) {
  if (!promotion || !promotion.visible || !promotion.title.trim()) return null;
  if (promotion.validUntil && new Date(promotion.validUntil).getTime() < new Date().getTime()) return null;

  const ctaIsSafe = !promotion.ctaUrl || isSafeHrefOrEmpty(promotion.ctaUrl);

  return (
    <section className={styles.banner} aria-label="מבצע פעיל">
      <Sparkles size={20} aria-hidden="true" className={styles.icon} />
      <div className={styles.content}>
        <p className={styles.title}>{promotion.title}</p>
        {promotion.description && <p className={styles.description}>{promotion.description}</p>}
      </div>
      {promotion.ctaLabel && promotion.ctaUrl && ctaIsSafe && (
        <Button href={promotion.ctaUrl} variant="accent" size="compact" target="_blank" rel="noopener noreferrer">
          {promotion.ctaLabel}
        </Button>
      )}
    </section>
  );
}

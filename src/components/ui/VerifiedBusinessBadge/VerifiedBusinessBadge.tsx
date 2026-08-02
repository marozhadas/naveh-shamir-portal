import { BadgeCheck } from "lucide-react";
import styles from "./VerifiedBusinessBadge.module.css";

type VerifiedBusinessBadgeProps = {
  className?: string;
};

const EXPLANATION = "עסק עם עמוד פעיל ומנוי בפורטל";

/**
 * The only place that renders the "עסק מאומת" badge — always call it with
 * `access.canShowVerifiedBadge` (never `business.verified`), so admin approval alone can never
 * make it appear (spec section 6: only an active subscription/trial can).
 */
export function VerifiedBusinessBadge({ className }: VerifiedBusinessBadgeProps) {
  return (
    <span className={`${styles.badge} ${className ?? ""}`} title={EXPLANATION} aria-label={`עסק מאומת. ${EXPLANATION}`}>
      <BadgeCheck size={14} aria-hidden="true" />
      עסק מאומת
    </span>
  );
}

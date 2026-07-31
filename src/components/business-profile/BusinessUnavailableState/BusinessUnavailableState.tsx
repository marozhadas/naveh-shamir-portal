import { EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./BusinessUnavailableState.module.css";

type BusinessUnavailableStateProps = {
  /** Only shown to the business owner/admin — never to the public (spec section 45: "don't expose the exact reason"). */
  detail?: string;
};

export function BusinessUnavailableState({ detail }: BusinessUnavailableStateProps) {
  return (
    <div className={styles.wrap} role="status">
      <EyeOff size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
      <h1 className={styles.title}>העמוד הזה אינו זמין כרגע</h1>
      {detail && <p className={styles.detail}>{detail}</p>}
      <Button href="/businesses" variant="secondary">
        חזרה לכל העסקים
      </Button>
    </div>
  );
}

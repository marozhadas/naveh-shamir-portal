"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./BusinessesErrorState.module.css";

type BusinessesErrorStateProps = {
  onRetry: () => void;
};

export function BusinessesErrorState({ onRetry }: BusinessesErrorStateProps) {
  return (
    <div className={styles.wrap} role="alert">
      <TriangleAlert size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
      <h2 className={styles.title}>לא הצלחנו לטעון את העסקים</h2>
      <p className={styles.description}>אפשר לנסות שוב בעוד רגע.</p>
      <Button variant="secondary" onClick={onRetry}>
        ניסיון נוסף
      </Button>
    </div>
  );
}

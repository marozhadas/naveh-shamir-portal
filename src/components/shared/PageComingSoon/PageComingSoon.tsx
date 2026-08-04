import { Construction } from "lucide-react";
import styles from "./PageComingSoon.module.css";

type PageComingSoonProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

/** Placeholder body for a page whose route/nav already exists but whose real content lands in a later build stage. */
export function PageComingSoon({ title, description, children }: PageComingSoonProps) {
  return (
    <div className={styles.panel} role="status">
      <Construction size={32} aria-hidden="true" className={styles.icon} />
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {children}
    </div>
  );
}

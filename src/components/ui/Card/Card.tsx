import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  hoverable?: boolean;
  noPadding?: boolean;
};

export function Card({ children, hoverable = true, noPadding, className, ...rest }: CardProps) {
  const classes = [styles.card, hoverable ? styles.hoverable : null, noPadding ? styles.noPadding : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

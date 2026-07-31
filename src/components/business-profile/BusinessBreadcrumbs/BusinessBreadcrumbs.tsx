import Link from "next/link";
import styles from "./BusinessBreadcrumbs.module.css";

type BusinessBreadcrumbsProps = {
  businessName: string;
};

export function BusinessBreadcrumbs({ businessName }: BusinessBreadcrumbsProps) {
  return (
    <nav aria-label="פירורי לחם" className={styles.breadcrumbs}>
      <ol className={styles.list}>
        <li>
          <Link href="/">בית</Link>
        </li>
        <li aria-hidden="true" className={styles.separator}>
          /
        </li>
        <li>
          <Link href="/businesses">עסקים</Link>
        </li>
        <li aria-hidden="true" className={styles.separator}>
          /
        </li>
        <li aria-current="page">{businessName}</li>
      </ol>
    </nav>
  );
}

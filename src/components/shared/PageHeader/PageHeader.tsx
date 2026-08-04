import Link from "next/link";
import styles from "./PageHeader.module.css";

type Crumb = { label: string; href?: string };

type PageHeaderProps = {
  breadcrumbs: Crumb[];
  title: string;
  description: string;
};

/** Shared breadcrumb + H1 + subtitle shell for top-level pages (matches the pattern already used on /businesses and /business/plans). */
export function PageHeader({ breadcrumbs, title, description }: PageHeaderProps) {
  return (
    <div className={styles.pageHead}>
      <nav aria-label="פירורי לחם" className={styles.breadcrumbs}>
        <ol className={styles.breadcrumbList}>
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.label} aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>
              {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
              {index < breadcrumbs.length - 1 && (
                <span aria-hidden="true" className={styles.separator}>
                  {" "}
                  /
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
    </div>
  );
}

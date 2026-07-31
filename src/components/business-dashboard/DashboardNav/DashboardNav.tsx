"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DashboardNav.module.css";

const TABS = [
  { href: "/business/dashboard", label: "סקירה כללית" },
  { href: "/business/dashboard/profile", label: "עריכת העסק" },
  { href: "/business/dashboard/preview", label: "תצוגה מקדימה" },
  { href: "/business/dashboard/subscription", label: "מנוי" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="ניווט דשבורד עסק" className={styles.nav}>
      <ul className={styles.list}>
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={isActive ? "page" : undefined} className={`${styles.link} ${isActive ? styles.active : ""}`}>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

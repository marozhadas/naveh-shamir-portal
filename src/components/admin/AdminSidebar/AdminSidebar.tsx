"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Bell, Settings, BarChart3, Recycle, CalendarDays, Phone, MessageSquare, MessagesSquare, X } from "lucide-react";
import { formatBadgeCount } from "@/utils/admin-notification-format";
import styles from "./AdminSidebar.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  /** Exact match only — otherwise `/admin` would stay "active" while viewing any sub-route. */
  exact?: boolean;
};

type AdminSidebarProps = {
  pendingBusinessesCount: number;
  openNotificationsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function AdminSidebar({ pendingBusinessesCount, openNotificationsCount, mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/admin", label: "ראשי", icon: <LayoutDashboard size={18} aria-hidden="true" />, exact: true },
    { href: "/admin/businesses", label: "עסקים", icon: <Building2 size={18} aria-hidden="true" /> },
    {
      href: "/admin/businesses/pending",
      label: "עסקים חדשים",
      icon: <Building2 size={18} aria-hidden="true" />,
      badge: pendingBusinessesCount,
    },
    { href: "/admin/marketplace", label: "מסירה ומכירה", icon: <Recycle size={18} aria-hidden="true" /> },
    { href: "/admin/events", label: "אירועים", icon: <CalendarDays size={18} aria-hidden="true" /> },
    { href: "/admin/essential-numbers", label: "מספרים חיוניים", icon: <Phone size={18} aria-hidden="true" /> },
    { href: "/admin/whatsapp-groups", label: "קבוצות WhatsApp", icon: <MessagesSquare size={18} aria-hidden="true" /> },
    { href: "/admin/contact", label: "פניות", icon: <MessageSquare size={18} aria-hidden="true" /> },
    { href: "/admin/notifications", label: "התראות", icon: <Bell size={18} aria-hidden="true" />, badge: openNotificationsCount },
    { href: "/admin/analytics", label: "אנליטיקה", icon: <BarChart3 size={18} aria-hidden="true" /> },
    { href: "/admin/settings/notifications", label: "הגדרות", icon: <Settings size={18} aria-hidden="true" /> },
  ];

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <>
      {mobileOpen && <div className={styles.backdrop} onClick={onCloseMobile} aria-hidden="true" />}
      <nav
        aria-label="ניווט ניהול"
        className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ""}`}
        id="admin-mobile-nav"
      >
        <div className={styles.mobileHeader}>
          <span className={styles.brand}>ניהול הפורטל</span>
          <button type="button" className={styles.closeButton} onClick={onCloseMobile} aria-label="סגירת תפריט ניווט">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <ul className={styles.list}>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.link} ${isActive(item) ? styles.active : ""}`}
                aria-current={isActive(item) ? "page" : undefined}
                onClick={onCloseMobile}
              >
                {item.icon}
                <span className={styles.label}>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className={styles.badge} aria-label={`${item.badge} פתוחים`}>
                    {formatBadgeCount(item.badge)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

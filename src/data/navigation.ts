import type { NavLink } from "@/types/navigation";

/** Every item is now a real page route — no anchors into homepage sections anymore. */
export const NAV_LINKS: NavLink[] = [
  { id: "home", label: "בית", href: "/" },
  { id: "businesses", label: "עסקים", href: "/businesses" },
  { id: "marketplace", label: "מסירה ומכירה", href: "/marketplace" },
  { id: "events", label: "אירועים", href: "/events" },
  { id: "essential", label: "מספרים חיוניים", href: "/essential-numbers" },
  { id: "boards", label: "לוח קהילה", href: "/community-board" },
  { id: "contact", label: "צור קשר", href: "/contact" },
];

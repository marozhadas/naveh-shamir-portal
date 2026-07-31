import type { NavLink } from "@/types/navigation";

/**
 * The non-"businesses" links are anchors into homepage sections, so they're prefixed with `/`
 * to resolve correctly from any page (e.g. /businesses) and not just while already on `/`.
 */
export const NAV_LINKS: NavLink[] = [
  { id: "home", label: "בית", href: "/#top" },
  { id: "businesses", label: "עסקים", href: "/businesses" },
  { id: "events", label: "אירועים", href: "/#events" },
  { id: "boards", label: "לוחות קהילה", href: "/#quick-links" },
  { id: "essential", label: "מידע חיוני", href: "/#essential" },
  { id: "contact", label: "צור קשר", href: "/#site-footer" },
];

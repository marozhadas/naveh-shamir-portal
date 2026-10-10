import { Briefcase, CalendarDays, Newspaper, Phone, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The icon row under the home hero. The same five destinations as the main navigation, in the same order
 * (right to left on screen): businesses, marketplace, events, news, essential numbers.
 */
export type HeroShortcut = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Pastel circle + matching icon colour — one distinct tone per shortcut. */
  tone: "slate" | "yellow" | "green" | "sky" | "blue";
};

export const HERO_SHORTCUTS: HeroShortcut[] = [
  { id: "businesses", label: "עסקים", href: "/businesses", icon: Briefcase, tone: "slate" },
  { id: "marketplace", label: "מסירה ומכירה", href: "/marketplace", icon: ShoppingBag, tone: "yellow" },
  { id: "events", label: "אירועים", href: "/events", icon: CalendarDays, tone: "green" },
  { id: "news", label: "חדשות השכונה", href: "/news", icon: Newspaper, tone: "sky" },
  { id: "essential-numbers", label: "מספרים חיוניים", href: "/essential-numbers", icon: Phone, tone: "blue" },
];

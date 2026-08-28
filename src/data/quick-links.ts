import type { QuickLink } from "@/types/quick-link";

export const QUICK_LINKS: QuickLink[] = [
  {
    id: "essential-phones",
    label: "טלפונים חיוניים",
    href: "/essential-numbers",
    icon: "phone",
    colorVariant: "yellow",
  },
  {
    id: "neighborhood-events",
    label: "אירועים בשכונה",
    href: "/events",
    icon: "calendar-days",
    colorVariant: "green",
  },
  {
    id: "gemach",
    label: 'יד שנייה / גמ"ח',
    href: "/marketplace",
    icon: "hand-heart",
    colorVariant: "blue",
  },
  {
    id: "business-directory",
    label: "מדריך עסקים",
    href: "/businesses",
    icon: "store",
    // With exactly 4 items across the 2-col/3-col/4-col grids this project uses, every pair ends
    // up adjacent to every other pair on some breakpoint — so all 4 colors must be distinct, which
    // this set already is (yellow/green/blue/orange, one each).
    colorVariant: "orange",
  },
];

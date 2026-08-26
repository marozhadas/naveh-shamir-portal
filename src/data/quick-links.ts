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
    // yellow/green/blue alone can't avoid same-color neighbors on both the 2-col mobile and
    // 3-col tablet grid at once with this fixed order (positions 3 and 4 are each adjacent —
    // across one grid or the other — to every other item, so 3 colors is provably insufficient).
    // This 4th color is what makes a same-color-neighbor-free layout possible at every breakpoint.
    colorVariant: "orange",
  },
  {
    id: "whatsapp-groups",
    label: "קבוצות וואטסאפ",
    href: "#whatsapp",
    icon: "message-circle",
    colorVariant: "yellow",
  },
  {
    id: "community-boards",
    label: "לוחות קהילה",
    href: "/community-board",
    icon: "clipboard-list",
    colorVariant: "green",
  },
];

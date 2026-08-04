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
    colorVariant: "yellow",
  },
  {
    id: "whatsapp-groups",
    label: "קבוצות וואטסאפ",
    href: "#whatsapp",
    icon: "message-circle",
    colorVariant: "green",
  },
  {
    id: "community-boards",
    label: "לוחות קהילה",
    href: "/community-board",
    icon: "clipboard-list",
    colorVariant: "blue",
  },
];

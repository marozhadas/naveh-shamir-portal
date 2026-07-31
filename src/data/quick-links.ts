import type { QuickLink } from "@/types/quick-link";

export const QUICK_LINKS: QuickLink[] = [
  {
    id: "essential-phones",
    label: "טלפונים חיוניים",
    href: "#essential",
    icon: "phone",
    colorVariant: "yellow",
  },
  {
    id: "neighborhood-events",
    label: "אירועים בשכונה",
    href: "#events",
    icon: "calendar-days",
    colorVariant: "green",
  },
  {
    id: "gemach",
    label: 'יד שנייה / גמ"ח',
    href: "#quick-links",
    icon: "hand-heart",
    colorVariant: "blue",
  },
  {
    id: "business-directory",
    label: "מדריך עסקים",
    href: "#businesses",
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
    href: "#quick-links",
    icon: "clipboard-list",
    colorVariant: "blue",
  },
];

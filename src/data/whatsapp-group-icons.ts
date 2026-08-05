import {
  Users,
  Baby,
  GraduationCap,
  Dumbbell,
  HandHeart,
  Building2,
  MapPin,
  Recycle,
  CalendarDays,
  ShieldAlert,
  MessageCircle,
  Home,
  Megaphone,
  Heart,
  UserRound,
  Sparkles,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * The allowlist of built-in icons an admin can pick for a WhatsApp group — only the icon's NAME is
 * ever stored (neighborhood_whatsapp_groups.icon_name), never JSX/markup, so this map is the single
 * place that resolves a stored name back to a real component. Any name not in this map (e.g. a
 * stale value from a since-removed icon) safely falls back to null and the caller falls back to the
 * real WhatsApp glyph.
 */
export const WHATSAPP_GROUP_ICON_MAP: Record<string, ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false"; strokeWidth?: number }>> = {
  Users,
  Baby,
  GraduationCap,
  Dumbbell,
  HandHeart,
  Building2,
  MapPin,
  Recycle,
  CalendarDays,
  ShieldAlert,
  MessageCircle,
  Home,
  Megaphone,
  Heart,
  UserRound,
  Sparkles,
};

export const WHATSAPP_GROUP_ICON_NAMES: string[] = Object.keys(WHATSAPP_GROUP_ICON_MAP);

export const WHATSAPP_GROUP_ICON_LABEL: Record<string, string> = {
  Users: "קהילה",
  Baby: "ילדים",
  GraduationCap: "חינוך",
  Dumbbell: "ספורט",
  HandHeart: "התנדבות",
  Building2: "בניין",
  MapPin: "רחוב / אזור",
  Recycle: "מסירה ומכירה",
  CalendarDays: "אירועים",
  ShieldAlert: "ביטחון",
  MessageCircle: "כללי",
  Home: "משפחות",
  Megaphone: "עדכונים",
  Heart: "נשים",
  UserRound: "גברים",
  Sparkles: "מומלץ",
};

export function isKnownWhatsAppGroupIconName(name: string): boolean {
  return name in WHATSAPP_GROUP_ICON_MAP;
}

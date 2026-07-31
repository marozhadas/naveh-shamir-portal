import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Gift,
  HandHeart,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Store,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { IconToken } from "@/editor/types/editor.types";

/**
 * Every icon selectable from the editor's icon picker, in one place — shared by every site
 * component that renders a user-chosen icon (QuickLinksSection, WhatsAppBanner, ...), so the
 * icon set available in the UI always matches what these components know how to render.
 */
export const ICON_TOKEN_COMPONENT: Record<IconToken, ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false"; strokeWidth?: number }>> = {
  phone: Phone,
  "calendar-days": CalendarDays,
  "hand-heart": HandHeart,
  store: Store,
  "message-circle": MessageCircle,
  "clipboard-list": ClipboardList,
  "map-pin": MapPin,
  users: Users,
  home: Home,
  heart: Heart,
  "book-open": BookOpen,
  gift: Gift,
};

export const ICON_TOKEN_LABEL: Record<IconToken, string> = {
  phone: "טלפון",
  "calendar-days": "יומן",
  "hand-heart": "יד ולב (גמ״ח)",
  store: "חנות",
  "message-circle": "בועת שיחה",
  "clipboard-list": "רשימה",
  "map-pin": "סימון מיקום",
  users: "אנשים",
  home: "בית",
  heart: "לב",
  "book-open": "ספר פתוח",
  gift: "מתנה",
};

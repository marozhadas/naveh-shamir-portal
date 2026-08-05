import {
  Ambulance,
  Baby,
  Bus,
  Building,
  Building2,
  Droplets,
  Flame,
  GraduationCap,
  HeartPulse,
  Hospital,
  Landmark,
  Lightbulb,
  Phone,
  PhoneCall,
  School,
  Shield,
  ShieldAlert,
  Siren,
  Stethoscope,
  Trash2,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * The full allowlist of icons an admin can pick for an essential number — only the icon's NAME is
 * ever stored (essential_numbers.icon_name), never JSX/markup, so this map is the single place
 * that resolves a stored name back to a real component. Any name not in this map (e.g. a stale
 * value from a since-removed icon) safely falls back to Phone rather than crashing.
 */
export const ESSENTIAL_NUMBER_ICON_MAP: Record<string, ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false"; strokeWidth?: number }>> = {
  Phone,
  PhoneCall,
  Ambulance,
  Hospital,
  Stethoscope,
  HeartPulse,
  Shield,
  ShieldAlert,
  Siren,
  School,
  GraduationCap,
  Bus,
  Building,
  Building2,
  Landmark,
  Users,
  Baby,
  Flame,
  Droplets,
  Zap,
  Lightbulb,
  Wrench,
  Trash2,
};

export const ESSENTIAL_NUMBER_ICON_NAMES: string[] = Object.keys(ESSENTIAL_NUMBER_ICON_MAP);

export const ESSENTIAL_NUMBER_ICON_LABEL: Record<string, string> = {
  Phone: "טלפון",
  PhoneCall: "שיחת טלפון",
  Ambulance: "אמבולנס",
  Hospital: "בית חולים",
  Stethoscope: "רפואה",
  HeartPulse: "דופק / חירום רפואי",
  Shield: "מגן",
  ShieldAlert: "אזהרת ביטחון",
  Siren: "צופר",
  School: "בית ספר",
  GraduationCap: "חינוך",
  Bus: "אוטובוס",
  BusFront: "תחבורה ציבורית",
  Building: "מבנה",
  Building2: "עירייה / מוסד",
  Landmark: "מוסד ציבורי",
  Users: "קהילה",
  Baby: "תינוקות / משפחה",
  Flame: "כיבוי אש",
  Droplets: "מים",
  Zap: "חשמל",
  Lightbulb: "תשתיות",
  Wrench: "תחזוקה",
  Trash2: "תברואה",
};

export function isKnownEssentialNumberIconName(name: string): boolean {
  return name in ESSENTIAL_NUMBER_ICON_MAP;
}

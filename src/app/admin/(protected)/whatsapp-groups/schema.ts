import { z } from "zod";
import { WHATSAPP_GROUP_CATEGORY_OPTIONS } from "@/types/whatsapp-group";
import { isKnownWhatsAppGroupIconName } from "@/data/whatsapp-group-icons";
import { isValidWhatsAppGroupUrl } from "@/utils/validate-whatsapp-group-url";

export type WhatsAppGroupFormValues = {
  name: string;
  description: string;
  category: string;
  inviteUrl: string;
  /** Comma-separated in the form UI; split into a string[] on save (schema.audience is the parsed array). */
  audience: string;
  areaOrStreet: string;
  iconType: "whatsapp" | "lucide" | "custom-image";
  iconName: string;
  iconAlt: string;
  rulesOrNotes: string;
  adminContactName: string;
  priority: string;
  featured: boolean;
};

export const EMPTY_WHATSAPP_GROUP_FORM_VALUES: WhatsAppGroupFormValues = {
  name: "",
  description: "",
  category: "",
  inviteUrl: "",
  audience: "",
  areaOrStreet: "",
  iconType: "whatsapp",
  iconName: "",
  iconAlt: "",
  rulesOrNotes: "",
  adminContactName: "",
  priority: "0",
  featured: false,
};

export const whatsAppGroupFormSchema = z
  .object({
    name: z.string().trim().min(1, "יש להזין שם קבוצה").max(140, "השם ארוך מדי — עד 140 תווים"),
    description: z.string().trim().max(300, "התיאור ארוך מדי — עד 300 תווים"),
    category: z.enum(WHATSAPP_GROUP_CATEGORY_OPTIONS as [string, ...string[]], { message: "יש לבחור קטגוריה" }),
    inviteUrl: z
      .string()
      .trim()
      .min(1, "יש להזין קישור הצטרפות ל-WhatsApp")
      .refine((v) => isValidWhatsAppGroupUrl(v), { message: "יש להזין קישור WhatsApp תקין (https://chat.whatsapp.com/... או wa.me/...)" }),
    audience: z.string().trim().max(300, "רשימת הקהלים ארוכה מדי — עד 300 תווים"),
    areaOrStreet: z.string().trim().max(140, "השדה ארוך מדי — עד 140 תווים"),
    iconType: z.enum(["whatsapp", "lucide", "custom-image"]),
    iconName: z.string().trim(),
    iconAlt: z.string().trim().max(160, "הטקסט החלופי ארוך מדי — עד 160 תווים"),
    rulesOrNotes: z.string().trim().max(600, "הטקסט ארוך מדי — עד 600 תווים"),
    adminContactName: z.string().trim().max(120, "השם ארוך מדי — עד 120 תווים"),
    priority: z.string().refine((v) => !Number.isNaN(Number(v)), { message: "סדר תצוגה חייב להיות מספר" }),
    featured: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.iconType === "lucide" && values.iconName && !isKnownWhatsAppGroupIconName(values.iconName)) {
      ctx.addIssue({ code: "custom", path: ["iconName"], message: "האייקון שנבחר אינו קיים ברשימת האייקונים המורשית" });
    }
    if (values.iconType === "custom-image" && !values.iconAlt.trim()) {
      ctx.addIssue({ code: "custom", path: ["iconAlt"], message: "יש להזין טקסט חלופי (alt) לאייקון מותאם" });
    }
  });

export const FIELD_ORDER: (keyof WhatsAppGroupFormValues)[] = ["name", "category", "inviteUrl", "description", "audience", "areaOrStreet", "iconName", "priority"];

/** Splits the form's comma-separated audience text into a clean array — trims, drops empties, dedupes. */
export function parseAudienceInput(value: string): string[] {
  const seen = new Set<string>();
  for (const raw of value.split(",")) {
    const trimmed = raw.trim();
    if (trimmed) seen.add(trimmed);
  }
  return Array.from(seen);
}

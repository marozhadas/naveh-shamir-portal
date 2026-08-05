import { z } from "zod";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";
import { ESSENTIAL_NUMBER_CATEGORY_OPTIONS, ESSENTIAL_NUMBER_ICON_TONE_OPTIONS } from "@/types/essential-number";
import { isKnownEssentialNumberIconName } from "@/data/essential-number-icons";

const PHONE_PATTERN = /^\+?[0-9-\s]{2,}$/;

export type EssentialNumberFormValues = {
  name: string;
  description: string;
  category: string;
  phone: string;
  displayPhone: string;
  whatsapp: string;
  websiteUrl: string;
  iconType: "lucide" | "custom-image";
  iconName: string;
  iconAlt: string;
  iconTone: string;
  openingHours: string;
  notes: string;
  priority: string;
  featured: boolean;
};

export const EMPTY_ESSENTIAL_NUMBER_FORM_VALUES: EssentialNumberFormValues = {
  name: "",
  description: "",
  category: "",
  phone: "",
  displayPhone: "",
  whatsapp: "",
  websiteUrl: "",
  iconType: "lucide",
  iconName: "",
  iconAlt: "",
  iconTone: "blue",
  openingHours: "",
  notes: "",
  priority: "0",
  featured: false,
};

export const essentialNumberFormSchema = z
  .object({
    name: z.string().trim().min(1, "יש להזין שם שירות").max(140, "השם ארוך מדי — עד 140 תווים"),
    description: z.string().trim().max(300, "התיאור ארוך מדי — עד 300 תווים"),
    category: z.enum(ESSENTIAL_NUMBER_CATEGORY_OPTIONS as [string, ...string[]], { message: "יש לבחור קטגוריה" }),
    phone: z.string().trim().min(1, "יש להזין מספר טלפון").refine((v) => PHONE_PATTERN.test(v), { message: "מספר הטלפון אינו תקין" }),
    displayPhone: z.string().trim().min(1, "יש להזין צורת תצוגה למספר"),
    whatsapp: z.string().trim().refine((v) => !v || PHONE_PATTERN.test(v), { message: "מספר הוואטסאפ אינו תקין" }),
    websiteUrl: z.string().trim().refine((v) => !v || isSafeHrefOrEmpty(v), { message: "כתובת האתר אינה תקינה — יש להשתמש בקישור https://" }),
    iconType: z.enum(["lucide", "custom-image"]),
    iconName: z.string().trim(),
    iconAlt: z.string().trim().max(160, "הטקסט החלופי ארוך מדי — עד 160 תווים"),
    iconTone: z.enum(ESSENTIAL_NUMBER_ICON_TONE_OPTIONS as [string, ...string[]]),
    openingHours: z.string().trim().max(200, "שעות הפעילות ארוכות מדי — עד 200 תווים"),
    notes: z.string().trim().max(300, "ההערה ארוכה מדי — עד 300 תווים"),
    priority: z.string().refine((v) => !Number.isNaN(Number(v)), { message: "סדר תצוגה חייב להיות מספר" }),
    featured: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.iconType === "lucide" && values.iconName && !isKnownEssentialNumberIconName(values.iconName)) {
      ctx.addIssue({ code: "custom", path: ["iconName"], message: "האייקון שנבחר אינו קיים ברשימת האייקונים המורשית" });
    }
    if (values.iconType === "custom-image" && !values.iconAlt.trim()) {
      ctx.addIssue({ code: "custom", path: ["iconAlt"], message: "יש להזין טקסט חלופי (alt) לאייקון מותאם" });
    }
  });

export const FIELD_ORDER: (keyof EssentialNumberFormValues)[] = ["name", "category", "phone", "displayPhone", "whatsapp", "websiteUrl", "iconName", "priority"];

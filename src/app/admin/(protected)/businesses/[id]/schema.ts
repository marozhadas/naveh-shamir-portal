import { z } from "zod";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";

const PHONE_PATTERN = /^\+?[0-9-\s]{6,}$/;

export type BusinessEditFormValues = {
  businessName: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  contactName: string;
  phone: string;
  whatsappPhone: string;
  email: string;
  websiteUrl: string;
  address: string;
  serviceArea: string;
  featured: boolean;
  verified: boolean;
};

export const businessEditFormSchema = z.object({
  businessName: z.string().trim().min(1, "יש להזין שם עסק").max(140, "השם ארוך מדי — עד 140 תווים"),
  categoryId: z.string().trim().min(1, "יש לבחור קטגוריה"),
  shortDescription: z.string().trim().max(200, "התיאור הקצר ארוך מדי — עד 200 תווים"),
  description: z.string().trim().min(1, "יש להזין תיאור").max(3000, "התיאור ארוך מדי — עד 3000 תווים"),
  contactName: z.string().trim().min(1, "יש להזין שם איש/אשת קשר"),
  phone: z.string().trim().refine((v) => !v || PHONE_PATTERN.test(v), { message: "מספר הטלפון אינו תקין" }),
  whatsappPhone: z.string().trim().refine((v) => !v || PHONE_PATTERN.test(v), { message: "מספר הוואטסאפ אינו תקין" }),
  email: z.string().trim().refine((v) => !v || z.string().email().safeParse(v).success, { message: "כתובת האימייל אינה תקינה" }),
  websiteUrl: z.string().trim().refine((v) => !v || isSafeHrefOrEmpty(v), { message: "כתובת האתר אינה תקינה — יש להשתמש בקישור https://" }),
  address: z.string().trim(),
  serviceArea: z.string().trim(),
  featured: z.boolean(),
  verified: z.boolean(),
});

import { z } from "zod";
import { MARKETPLACE_CATEGORIES } from "@/data/marketplace-categories";

export type MarketplaceListingFormValues = {
  title: string;
  description: string;
  listingType: "giveaway" | "sale" | "";
  categoryId: string;
  isFree: boolean;
  price: string;
  condition: string;
  area: string;
  contactName: string;
  phone: string;
  whatsappPhone: string;
};

export const EMPTY_LISTING_FORM_VALUES: MarketplaceListingFormValues = {
  title: "",
  description: "",
  listingType: "",
  categoryId: "",
  isFree: false,
  price: "",
  condition: "",
  area: "",
  contactName: "",
  phone: "",
  whatsappPhone: "",
};

export const FIELD_ORDER: (keyof MarketplaceListingFormValues)[] = [
  "title",
  "description",
  "listingType",
  "categoryId",
  "price",
  "contactName",
  "phone",
  "whatsappPhone",
];

const PHONE_PATTERN = /^\+?[0-9-\s]{6,}$/;
const AT_LEAST_ONE_CONTACT_METHOD_MESSAGE = "יש להזין לפחות דרך התקשרות אחת (טלפון או וואטסאפ)";

export const marketplaceListingSchema = z
  .object({
    title: z.string().trim().min(1, "יש להזין שם פריט").max(120, "השם ארוך מדי — עד 120 תווים"),
    description: z.string().trim().min(1, "יש להוסיף תיאור").max(800, "התיאור ארוך מדי — עד 800 תווים"),
    listingType: z.enum(["giveaway", "sale"], { message: "יש לבחור סוג פרסום" }),
    categoryId: z.string().refine((value) => MARKETPLACE_CATEGORIES.some((category) => category.id === value), {
      message: "יש לבחור קטגוריה מהרשימה",
    }),
    isFree: z.boolean(),
    price: z.string().trim(),
    condition: z.string().trim(),
    area: z.string().trim(),
    contactName: z.string().trim().min(1, "יש להזין שם איש/אשת קשר").max(120, "השם ארוך מדי — עד 120 תווים"),
    phone: z.string().trim().refine((value) => !value || PHONE_PATTERN.test(value), { message: "מספר הטלפון אינו תקין" }),
    whatsappPhone: z.string().trim().refine((value) => !value || PHONE_PATTERN.test(value), { message: "מספר הוואטסאפ אינו תקין" }),
  })
  .superRefine((values, ctx) => {
    if (!values.phone && !values.whatsappPhone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: AT_LEAST_ONE_CONTACT_METHOD_MESSAGE });
      ctx.addIssue({ code: "custom", path: ["whatsappPhone"], message: AT_LEAST_ONE_CONTACT_METHOD_MESSAGE });
    }
    if (!values.isFree) {
      const parsedPrice = Number(values.price);
      if (!values.price || Number.isNaN(parsedPrice) || parsedPrice < 0) {
        ctx.addIssue({ code: "custom", path: ["price"], message: "יש להזין מחיר תקין, או לסמן שהפריט חינם" });
      }
    }
  });

export function firstInvalidField(
  fieldErrors: Partial<Record<keyof MarketplaceListingFormValues, string[]>> | undefined,
): keyof MarketplaceListingFormValues | null {
  if (!fieldErrors) return null;
  return FIELD_ORDER.find((field) => (fieldErrors[field]?.length ?? 0) > 0) ?? null;
}

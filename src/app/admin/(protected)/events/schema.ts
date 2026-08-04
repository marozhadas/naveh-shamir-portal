import { z } from "zod";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";

const PHONE_PATTERN = /^\+?[0-9-\s]{6,}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export type EventFormValues = {
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  audience: string[];
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  isFree: boolean;
  priceText: string;
  registrationUrl: string;
  contactPhone: string;
  whatsapp: string;
  featured: boolean;
  displayOrder: string;
};

export const EMPTY_EVENT_FORM_VALUES: EventFormValues = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  audience: [],
  category: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  locationName: "",
  address: "",
  isFree: true,
  priceText: "",
  registrationUrl: "",
  contactPhone: "",
  whatsapp: "",
  featured: false,
  displayOrder: "0",
};

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "יש להזין שם אירוע").max(140, "השם ארוך מדי — עד 140 תווים"),
    slug: z
      .string()
      .trim()
      .min(1, "יש להזין Slug")
      .regex(/^[\p{L}\p{N}-]+$/u, "Slug יכול להכיל רק אותיות, מספרים ומקפים"),
    shortDescription: z.string().trim().min(1, "יש להזין תיאור קצר").max(200, "התיאור הקצר ארוך מדי — עד 200 תווים"),
    fullDescription: z.string().trim().min(1, "יש להזין תיאור מלא").max(3000, "התיאור המלא ארוך מדי — עד 3000 תווים"),
    audience: z.array(z.enum(["children", "women", "men", "family"])).min(1, "יש לבחור לפחות קהל יעד אחד"),
    category: z.string().trim(),
    eventDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: "תאריך לא תקין" }),
    startTime: z.string().regex(TIME_PATTERN, "שעת התחלה לא תקינה"),
    endTime: z.string().refine((v) => !v || TIME_PATTERN.test(v), { message: "שעת סיום לא תקינה" }),
    locationName: z.string().trim().min(1, "יש להזין שם מקום"),
    address: z.string().trim(),
    isFree: z.boolean(),
    priceText: z.string().trim(),
    registrationUrl: z.string().trim().refine((v) => !v || isSafeHrefOrEmpty(v), { message: "כתובת ההרשמה אינה תקינה — יש להשתמש בקישור https://" }),
    contactPhone: z.string().trim().refine((v) => !v || PHONE_PATTERN.test(v), { message: "מספר הטלפון אינו תקין" }),
    whatsapp: z.string().trim().refine((v) => !v || PHONE_PATTERN.test(v), { message: "מספר הוואטסאפ אינו תקין" }),
    featured: z.boolean(),
    displayOrder: z.string().refine((v) => !Number.isNaN(Number(v)), { message: "סדר תצוגה חייב להיות מספר" }),
  })
  .superRefine((values, ctx) => {
    if (values.endTime && values.endTime <= values.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "שעת הסיום חייבת להיות אחרי שעת ההתחלה" });
    }
    if (!values.isFree && !values.priceText.trim()) {
      ctx.addIssue({ code: "custom", path: ["priceText"], message: "יש להזין מחיר או טקסט מחיר כשהאירוע בתשלום" });
    }
  });

export const FIELD_ORDER: (keyof EventFormValues)[] = [
  "title",
  "slug",
  "shortDescription",
  "fullDescription",
  "audience",
  "eventDate",
  "startTime",
  "endTime",
  "locationName",
  "priceText",
  "registrationUrl",
  "contactPhone",
  "whatsapp",
];

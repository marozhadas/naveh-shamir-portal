import { z } from "zod";

export type CommunityNewsFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
};

export const EMPTY_COMMUNITY_NEWS_FORM_VALUES: CommunityNewsFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
};

export const communityNewsFormSchema = z.object({
  title: z.string().trim().min(1, "יש להזין כותרת").max(140, "הכותרת ארוכה מדי — עד 140 תווים"),
  slug: z
    .string()
    .trim()
    .min(1, "יש להזין Slug")
    .regex(/^[\p{L}\p{N}-]+$/u, "Slug יכול להכיל רק אותיות, מספרים ומקפים"),
  excerpt: z.string().trim().min(1, "יש להזין תקציר קצר").max(220, "התקציר ארוך מדי — עד 220 תווים"),
  body: z.string().trim().min(1, "יש להזין את גוף הכתבה").max(5000, "הכתבה ארוכה מדי — עד 5000 תווים"),
});

export const FIELD_ORDER: (keyof CommunityNewsFormValues)[] = ["title", "slug", "excerpt", "body"];

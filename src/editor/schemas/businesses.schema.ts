import { z } from "zod";
import {
  colorTokenSchema,
  containerWidthTokenSchema,
  editableImageSchema,
  radiusTokenSchema,
  shadowTokenSchema,
  spacingTokenSchema,
  textAlignTokenSchema,
} from "./tokens.schema";
import { CONTENT_LIMITS } from "./content-limits";
import { isSafeHrefOrEmpty } from "@/editor/utils/validate-href";

export const businessCategorySchema = z.enum(["אוכל", "חוגים", 'גמ"ח', "שירותים"]);

const phoneOrEmpty = z
  .string()
  .refine((value) => value === "" || /^tel:\+?[0-9-]{6,}$/.test(value), { message: 'מספר טלפון לא תקין (למשל tel:+972500000000)' });

const whatsappUrlOrEmpty = z
  .string()
  .refine((value) => value === "" || value.startsWith("https://"), { message: "קישור וואטסאפ חייב להתחיל ב-https://" });

export const businessCardContentSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1, "שם העסק לא יכול להיות ריק").max(CONTENT_LIMITS.cardTitle),
  category: businessCategorySchema,
  description: z.string().max(CONTENT_LIMITS.cardDescription),
  image: editableImageSchema,
  callButtonLabel: z.string().min(1).max(CONTENT_LIMITS.ctaLabel),
  whatsappButtonLabel: z.string().min(1).max(CONTENT_LIMITS.ctaLabel),
  phone: phoneOrEmpty,
  whatsappUrl: whatsappUrlOrEmpty,
  cardUrl: z.string().refine(isSafeHrefOrEmpty, { message: "כתובת לא תקינה" }),
  visible: z.boolean(),
});

export const featuredBusinessesSettingsSchema = z
  .object({
    content: z.object({
      sectionTitle: z.string().min(1, "כותרת הסקשן לא יכולה להיות ריקה").max(CONTENT_LIMITS.sectionTitle),
      showAllLinkVisible: z.boolean(),
      showAllLinkLabel: z.string().max(CONTENT_LIMITS.ctaLabel),
      showAllLinkHref: z.string().refine(isSafeHrefOrEmpty, { message: "כתובת לא תקינה" }),
      visibleCount: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      cardsOrder: z.array(z.string()).min(1),
      cards: z.array(businessCardContentSchema).min(1, "נדרש לפחות עסק אחד").max(12, "עד 12 עסקים"),
    }),
    appearance: z.object({
      sectionBackgroundColorToken: colorTokenSchema,
      titleColorToken: colorTokenSchema,
      textColorToken: colorTokenSchema,
      cardBackgroundColorToken: colorTokenSchema,
      cardRadiusToken: radiusTokenSchema,
      cardShadowToken: shadowTokenSchema,
      // Category tag colors stay derived per-category (see CategoryTag component) —
      // a single global override would break the brand's category-color mapping.
      // Not exposed in the editor; revisit as a per-category override map in a future phase.
      imageAspectRatio: z.enum(["1:1", "4:3", "16:9"]),
      cardHoverEffect: z.enum(["none", "lift"]),
      buttonVariant: z.enum(["primary", "secondary", "accent", "whatsapp", "navy"]),
    }),
    layout: z.object({
      columnsDesktop: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      columnsTablet: z.union([z.literal(1), z.literal(2)]),
      columnsMobile: z.literal(1),
      gap: spacingTokenSchema,
      containerMaxWidth: containerWidthTokenSchema,
      sectionPaddingBlock: z.object({ start: spacingTokenSchema, end: spacingTokenSchema }),
      titleAlignment: textAlignTokenSchema,
    }),
  })
  .superRefine((section, ctx) => {
    if (!section.content.cards.some((card) => card.visible)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "חייב להישאר לפחות עסק אחד גלוי",
        path: ["content", "cards"],
      });
    }
    const ids = section.content.cards.map((card) => card.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "קיימים IDs כפולים בעסקים", path: ["content", "cards"] });
    }
    const orderSet = new Set(section.content.cardsOrder);
    if (orderSet.size !== section.content.cardsOrder.length || !ids.every((id) => orderSet.has(id))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "סדר העסקים אינו תואם לרשימת העסקים",
        path: ["content", "cardsOrder"],
      });
    }
  });

export type FeaturedBusinessesEditorSettings = z.infer<typeof featuredBusinessesSettingsSchema>;
export type BusinessCardContentSettings = z.infer<typeof businessCardContentSchema>;

import { z } from "zod";
import {
  buttonVariantTokenSchema,
  colorTokenSchema,
  containerWidthTokenSchema,
  iconTokenSchema,
  radiusTokenSchema,
  shadowTokenSchema,
  spacingTokenSchema,
} from "./tokens.schema";
import { CONTENT_LIMITS } from "./content-limits";

export const whatsappBannerSettingsSchema = z
  .object({
    content: z.object({
      title: z.string().min(1, "כותרת הבאנר לא יכולה להיות ריקה").max(CONTENT_LIMITS.sectionTitle),
      description: z.string().max(CONTENT_LIMITS.bannerDescription),
      buttonLabel: z.string().min(1).max(CONTENT_LIMITS.ctaLabel),
      whatsappUrl: z
        .string()
        .min(1)
        .refine((value) => value.startsWith("https://"), { message: "כתובת הקישור חייבת להתחיל ב-https://" }),
    }),
    appearance: z.object({
      backgroundColorToken: colorTokenSchema,
      titleColorToken: colorTokenSchema,
      descriptionColorToken: colorTokenSchema,
      buttonVariant: buttonVariantTokenSchema,
      radiusToken: radiusTokenSchema,
      shadowToken: shadowTokenSchema,
    }),
    layout: z.object({
      contentAlignment: z.enum(["start", "center", "space-between"]),
      direction: z.enum(["row", "column"]),
      paddingBlock: z.object({ start: spacingTokenSchema, end: spacingTokenSchema }),
      maxContentWidth: containerWidthTokenSchema,
      gap: spacingTokenSchema,
    }),
    visibility: z.object({
      showIcon: z.boolean(),
      iconName: iconTokenSchema,
      hideOnMobile: z.boolean(),
    }),
  })
  .superRefine((banner, ctx) => {
    if (!banner.content.title.trim() && !banner.content.description.trim() && !banner.content.buttonLabel.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "לא ניתן להסתיר את הכותרת, התיאור והכפתור בו-זמנית",
        path: ["content"],
      });
    }
  });

export type WhatsAppBannerEditorSettings = z.infer<typeof whatsappBannerSettingsSchema>;

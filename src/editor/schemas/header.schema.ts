import { z } from "zod";
import {
  buttonVariantTokenSchema,
  colorTokenSchema,
  containerWidthTokenSchema,
  editableImageSchema,
  shadowTokenSchema,
  spacingTokenSchema,
} from "./tokens.schema";
import { CONTENT_LIMITS } from "./content-limits";
import { isSafeHref, isSafeHrefOrEmpty } from "@/editor/utils/validate-href";

export const headerNavItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "טקסט הקישור לא יכול להיות ריק").max(CONTENT_LIMITS.ctaLabel),
  href: z.string().min(1).refine(isSafeHref, { message: "כתובת לא תקינה" }),
  visible: z.boolean(),
});

export const headerSettingsSchema = z
  .object({
    content: z.object({
      logo: editableImageSchema,
      ctaLabel: z.string().min(1, "טקסט הכפתור לא יכול להיות ריק").max(CONTENT_LIMITS.ctaLabel),
      ctaHref: z.string().min(1).refine(isSafeHref, { message: "כתובת לא תקינה" }),
      personalAreaLabel: z.string().min(1).max(CONTENT_LIMITS.ctaLabel),
      personalAreaHref: z.string().refine(isSafeHrefOrEmpty, { message: "כתובת לא תקינה" }),
      showPersonalAreaButton: z.boolean(),
      navItems: z.array(headerNavItemSchema).min(1).max(8),
    }),
    appearance: z.object({
      backgroundColorToken: colorTokenSchema,
      textColorToken: colorTokenSchema,
      linkColorToken: colorTokenSchema,
      ctaVariant: buttonVariantTokenSchema,
      headerShadow: shadowTokenSchema,
      sticky: z.boolean(),
    }),
    layout: z.object({
      containerMaxWidth: containerWidthTokenSchema,
      navItemGap: spacingTokenSchema,
      logoNavGap: spacingTokenSchema,
      showDesktopNav: z.boolean(),
    }),
  })
  .superRefine((header, ctx) => {
    if (!header.content.navItems.some((item) => item.visible)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "חייב להישאר לפחות פריט ניווט אחד גלוי",
        path: ["content", "navItems"],
      });
    }
  });

export type HeaderNavItem = z.infer<typeof headerNavItemSchema>;
export type HeaderEditorSettings = z.infer<typeof headerSettingsSchema>;

import { z } from "zod";
import { colorTokenSchema, iconTokenSchema, radiusTokenSchema, shadowTokenSchema, spacingTokenSchema } from "./tokens.schema";
import { CONTENT_LIMITS } from "./content-limits";
import { isSafeHref } from "@/editor/utils/validate-href";

export const quickLinkItemSettingsSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "הטקסט של הקישור לא יכול להיות ריק").max(CONTENT_LIMITS.ctaLabel),
  href: z.string().min(1).refine(isSafeHref, { message: "כתובת לא תקינה" }),
  icon: iconTokenSchema,
  colorVariant: z.enum(["yellow", "green", "blue", "orange"]),
  visible: z.boolean(),
});

export const quickLinksSettingsSchema = z
  .object({
    content: z.object({
      sectionTitle: z.string().max(CONTENT_LIMITS.sectionTitle),
      items: z.array(quickLinkItemSettingsSchema).min(2, "נדרשים לפחות 2 פריטים").max(8, "עד 8 פריטים"),
    }),
    appearance: z.object({
      panelBackgroundColorToken: colorTokenSchema,
      panelRadiusToken: radiusTokenSchema,
      panelShadowToken: shadowTokenSchema,
      itemHoverEffect: z.enum(["none", "background", "lift"]),
      cardColorToken: colorTokenSchema,
      textColorToken: colorTokenSchema,
    }),
    layout: z.object({
      columnsDesktop: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
      columnsTablet: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      columnsMobile: z.union([z.literal(1), z.literal(2)]),
      gap: spacingTokenSchema,
      paddingBlock: spacingTokenSchema,
      paddingInline: spacingTokenSchema,
      containerMaxWidth: z.enum(["md", "lg", "xl"]),
      contentAlignment: z.enum(["start", "center"]),
      iconSize: z.enum(["sm", "md", "lg"]),
      itemPadding: spacingTokenSchema,
    }),
    visibility: z.object({
      showSectionTitle: z.boolean(),
    }),
  })
  .superRefine((section, ctx) => {
    if (!section.content.items.some((item) => item.visible)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "חייב להישאר לפחות פריט אחד גלוי",
        path: ["content", "items"],
      });
    }
    const ids = section.content.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "קיימים IDs כפולים בפריטים", path: ["content", "items"] });
    }
  });

export type QuickLinksEditorSettings = z.infer<typeof quickLinksSettingsSchema>;
export type QuickLinkItemSettings = z.infer<typeof quickLinkItemSettingsSchema>;

import { z } from "zod";
import { colorTokenSchema, editableImageSchema, fontSizeTokenSchema, spacingTokenSchema } from "./tokens.schema";
import { CONTENT_LIMITS } from "./content-limits";
import { isSafeHref, isSafeHrefOrEmpty } from "@/editor/utils/validate-href";

export const footerLegalLinkSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(CONTENT_LIMITS.legalLinkLabel),
  href: z.string().min(1).refine(isSafeHref, { message: "כתובת לא תקינה" }),
});

export const footerNavItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "טקסט הקישור לא יכול להיות ריק").max(CONTENT_LIMITS.ctaLabel),
  href: z.string().min(1).refine(isSafeHref, { message: "כתובת לא תקינה" }),
  visible: z.boolean(),
});

export const footerSettingsSchema = z
  .object({
    content: z.object({
      logo: editableImageSchema,
      description: z.string().max(CONTENT_LIMITS.footerDescription),
      navColumnTitle: z.string().min(1).max(CONTENT_LIMITS.footerColumnTitle),
      essentialColumnTitle: z.string().min(1).max(CONTENT_LIMITS.footerColumnTitle),
      creditText: z.string().min(1, "טקסט הקרדיט לא יכול להיות ריק").max(CONTENT_LIMITS.footerCreditText),
      /** Optional — an empty value keeps the credit as plain text, exactly like before this field existed. */
      creditUrl: z.string().refine(isSafeHrefOrEmpty, { message: "כתובת לא תקינה" }),
      navItems: z.array(footerNavItemSchema).min(1).max(8),
      legalLinks: z.array(footerLegalLinkSchema),
      /** Guarded here too: cannot be turned off once the site is live (spec safeguard). */
      showLegalLinks: z.boolean(),
    }),
    appearance: z.object({
      backgroundColorToken: colorTokenSchema,
      textColorToken: colorTokenSchema,
      linkColorToken: colorTokenSchema,
      linkHoverColorToken: colorTokenSchema,
      borderColorToken: colorTokenSchema,
      textSizeToken: fontSizeTokenSchema,
      logoSizeToken: z.enum(["sm", "md", "lg"]),
    }),
    layout: z.object({
      columnsDesktop: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      columnsTablet: z.union([z.literal(1), z.literal(2)]),
      gap: spacingTokenSchema,
      /**
       * Only the top padding is exposed: the footer's bottom bar uses a fixed
       * 28px in the shipped design, which isn't on the 4px spacing scale, so it
       * stays hardcoded in Footer.module.css rather than being force-fit here.
       */
      paddingBlockStart: spacingTokenSchema,
      contentAlignment: z.enum(["start", "space-between"]),
    }),
  })
  .superRefine((footer, ctx) => {
    if (!footer.content.showLegalLinks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "לא ניתן להסתיר את קישורי המידע המשפטי",
        path: ["content", "showLegalLinks"],
      });
    }
    if (!footer.content.navItems.some((item) => item.visible)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "חייב להישאר לפחות קישור ניווט אחד גלוי",
        path: ["content", "navItems"],
      });
    }
  });

export type FooterEditorSettings = z.infer<typeof footerSettingsSchema>;
export type FooterNavItem = z.infer<typeof footerNavItemSchema>;
export type FooterLegalLink = z.infer<typeof footerLegalLinkSchema>;

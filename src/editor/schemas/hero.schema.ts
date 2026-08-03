import { z } from "zod";
import {
  colorTokenSchema,
  fontWeightTokenSchema,
  radiusTokenSchema,
  shadowTokenSchema,
  spacingTokenSchema,
  textAlignTokenSchema,
} from "./tokens.schema";

/** Free-form pixel size (not a bounded token) — the editor lets you type any value in this range. */
const pxSizeSchema = z.number().int().min(8).max(400);
import { CONTENT_LIMITS } from "./content-limits";

export const heroSettingsSchema = z.object({
  content: z.object({
    title: z.string().min(1, "כותרת ראשית לא יכולה להיות ריקה").max(CONTENT_LIMITS.heroTitle),
    description: z.string().max(CONTENT_LIMITS.heroDescription),
    searchPlaceholder: z.string().max(CONTENT_LIMITS.searchPlaceholder),
  }),
  appearance: z.object({
    backgroundColorToken: colorTokenSchema,
    titleColorToken: colorTokenSchema,
    descriptionColorToken: colorTokenSchema,
    titleSizeToken: pxSizeSchema,
    titleWeightToken: fontWeightTokenSchema,
    descriptionSizeToken: pxSizeSchema,
    searchBarRadiusToken: radiusTokenSchema,
    searchBarShadowToken: shadowTokenSchema,
    contentAlignment: textAlignTokenSchema,
  }),
  layout: z.object({
    maxContentWidth: z.enum(["sm", "md", "lg"]),
    paddingBlockDesktop: z.object({ start: spacingTokenSchema, end: spacingTokenSchema }),
    titleToDescriptionGap: spacingTokenSchema,
    descriptionToSearchGap: spacingTokenSchema,
  }),
  responsive: z.object({
    titleSizeMobileToken: pxSizeSchema,
    paddingBlockMobile: z.object({ start: spacingTokenSchema, end: spacingTokenSchema }),
    contentAlignmentMobile: textAlignTokenSchema,
    showIllustrationMobile: z.boolean(),
  }),
  visibility: z.object({
    showSearch: z.boolean(),
    showIllustration: z.boolean(),
  }),
});

export type HeroEditorSettings = z.infer<typeof heroSettingsSchema>;

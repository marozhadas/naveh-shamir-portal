import { z } from "zod";
import {
  colorTokenSchema,
  fontSizeTokenSchema,
  fontWeightTokenSchema,
  radiusTokenSchema,
  shadowTokenSchema,
  spacingTokenSchema,
  textAlignTokenSchema,
} from "./tokens.schema";
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
    titleSizeToken: fontSizeTokenSchema,
    titleWeightToken: fontWeightTokenSchema,
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
    titleSizeMobileToken: fontSizeTokenSchema,
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

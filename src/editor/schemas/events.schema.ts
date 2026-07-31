import { z } from "zod";
import {
  buttonVariantTokenSchema,
  colorTokenSchema,
  containerWidthTokenSchema,
  radiusTokenSchema,
  shadowTokenSchema,
  spacingTokenSchema,
  textAlignTokenSchema,
} from "./tokens.schema";
import { CONTENT_LIMITS } from "./content-limits";
import { isSafeHrefOrEmpty } from "@/editor/utils/validate-href";

function isValidIsoDateOrEmpty(value: string): boolean {
  return value === "" || !Number.isNaN(Date.parse(value));
}

export const eventCardContentSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1, "שם האירוע לא יכול להיות ריק").max(CONTENT_LIMITS.cardTitle),
    description: z.string().max(CONTENT_LIMITS.cardDescription),
    startDate: z.string().refine(isValidIsoDateOrEmpty, { message: "תאריך לא תקין" }),
    endDate: z.string().refine(isValidIsoDateOrEmpty, { message: "תאריך לא תקין" }),
    displayDay: z.string().min(1).max(4),
    displayMonth: z.string().min(1).max(8),
    displayTime: z.string().min(1).max(CONTENT_LIMITS.eventTimeLabel),
    location: z.string().min(1, "המיקום לא יכול להיות ריק").max(CONTENT_LIMITS.eventLocation),
    priceLabel: z.string().max(CONTENT_LIMITS.eventTimeLabel),
    calendarUrl: z.string().refine(isSafeHrefOrEmpty, { message: "כתובת לא תקינה" }),
    calendarButtonLabel: z.string().min(1).max(CONTENT_LIMITS.ctaLabel),
    visible: z.boolean(),
  })
  .superRefine((event, ctx) => {
    if (event.startDate && event.endDate && Date.parse(event.endDate) < Date.parse(event.startDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "תאריך הסיום לא יכול להיות לפני תאריך ההתחלה", path: ["endDate"] });
    }
  });

export const upcomingEventsSettingsSchema = z
  .object({
    content: z.object({
      sectionTitle: z.string().min(1, "כותרת הסקשן לא יכולה להיות ריקה").max(CONTENT_LIMITS.sectionTitle),
      showAllLinkVisible: z.boolean(),
      showAllLinkLabel: z.string().max(CONTENT_LIMITS.ctaLabel),
      showAllLinkHref: z.string().refine(isSafeHrefOrEmpty, { message: "כתובת לא תקינה" }),
      visibleCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      eventsOrder: z.array(z.string()).min(1),
      events: z.array(eventCardContentSchema).min(1, "נדרש לפחות אירוע אחד").max(12, "עד 12 אירועים"),
    }),
    appearance: z.object({
      sectionBackgroundColorToken: colorTokenSchema,
      cardBackgroundColorToken: colorTokenSchema,
      textColorToken: colorTokenSchema,
      dateBadgeAccentColorToken: colorTokenSchema,
      cardRadiusToken: radiusTokenSchema,
      cardShadowToken: shadowTokenSchema,
      buttonVariant: buttonVariantTokenSchema,
    }),
    layout: z.object({
      columnsDesktop: z.union([z.literal(2), z.literal(3)]),
      columnsTablet: z.union([z.literal(1), z.literal(2)]),
      columnsMobile: z.literal(1),
      gap: spacingTokenSchema,
      containerMaxWidth: containerWidthTokenSchema,
      sectionPaddingBlock: z.object({ start: spacingTokenSchema, end: spacingTokenSchema }),
      titleAlignment: textAlignTokenSchema,
    }),
  })
  .superRefine((section, ctx) => {
    if (!section.content.events.some((event) => event.visible)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "חייב להישאר לפחות אירוע אחד גלוי",
        path: ["content", "events"],
      });
    }
    const ids = section.content.events.map((event) => event.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "קיימים IDs כפולים באירועים", path: ["content", "events"] });
    }
  });

export type UpcomingEventsEditorSettings = z.infer<typeof upcomingEventsSettingsSchema>;
export type EventCardContentSettings = z.infer<typeof eventCardContentSchema>;

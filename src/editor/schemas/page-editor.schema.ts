import { z } from "zod";
import { headerSettingsSchema } from "./header.schema";
import { heroSettingsSchema } from "./hero.schema";
import { quickLinksSettingsSchema } from "./quick-links.schema";
import { featuredBusinessesSettingsSchema } from "./businesses.schema";
import { upcomingEventsSettingsSchema } from "./events.schema";
import { whatsappBannerSettingsSchema } from "./whatsapp.schema";
import { footerSettingsSchema } from "./footer.schema";

export const homeSectionIdSchema = z.enum(["quickLinks", "featuredBusinesses", "upcomingEvents", "whatsappBanner"]);

export const MOVABLE_SECTION_IDS = ["quickLinks", "featuredBusinesses", "upcomingEvents", "whatsappBanner"] as const;

export const pageEditorStateSchema = z
  .object({
    version: z.literal(2),
    pageId: z.literal("home"),
    updatedAt: z.string(),
    sectionsOrder: z.array(homeSectionIdSchema).length(MOVABLE_SECTION_IDS.length),
    /** Section-level show/hide (spec section 13) — Header/Hero/Footer are never eligible, so they're not in this list at all. */
    hiddenSections: z.array(homeSectionIdSchema),
    sections: z.object({
      header: headerSettingsSchema,
      hero: heroSettingsSchema,
      quickLinks: quickLinksSettingsSchema,
      featuredBusinesses: featuredBusinessesSettingsSchema,
      upcomingEvents: upcomingEventsSettingsSchema,
      whatsappBanner: whatsappBannerSettingsSchema,
      footer: footerSettingsSchema,
    }),
  })
  .superRefine((state, ctx) => {
    const seen = new Set(state.sectionsOrder);
    if (seen.size !== state.sectionsOrder.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "sectionsOrder מכיל כפילויות", path: ["sectionsOrder"] });
    }
    for (const id of MOVABLE_SECTION_IDS) {
      if (!seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `sectionsOrder חסר את הסקשן "${id}"`,
          path: ["sectionsOrder"],
        });
      }
    }
    const hiddenSet = new Set(state.hiddenSections);
    if (hiddenSet.size !== state.hiddenSections.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "hiddenSections מכיל כפילויות", path: ["hiddenSections"] });
    }
    // Safeguard (spec section 8/26): legal info can never be fully hidden.
    if (!state.sections.footer.content.showLegalLinks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "לא ניתן להסתיר את קישורי המידע המשפטי בפוטר",
        path: ["sections", "footer", "content", "showLegalLinks"],
      });
    }
  });

export type PageEditorState = z.infer<typeof pageEditorStateSchema>;
export type HomeSectionId = z.infer<typeof homeSectionIdSchema>;

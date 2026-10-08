import { z } from "zod";
import { OFFER_CODES } from "@/data/subscription-offers";

/**
 * The only shape changeBusinessOfferAction accepts. Deliberately no `pilot`, `trialDays` or price
 * field: the trial length is derived server-side from the offer stored on the business, and the
 * offer code itself must be one of the known codes — never free text.
 */
export const changeBusinessOfferSchema = z.object({
  businessId: z.string().min(1, "יש לציין מזהה עסק"),
  offerCode: z.enum(OFFER_CODES as [string, ...string[]], { message: "יש לבחור קבוצת הטבה מהרשימה בלבד" }) as unknown as z.ZodType<(typeof OFFER_CODES)[number]>,
  reason: z.string().trim().max(500, "הסיבה ארוכה מדי — עד 500 תווים").optional(),
});

export type ChangeBusinessOfferInput = z.infer<typeof changeBusinessOfferSchema>;

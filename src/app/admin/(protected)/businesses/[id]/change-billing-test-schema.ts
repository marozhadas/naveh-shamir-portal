import { z } from "zod";

/**
 * The only shape changeBusinessBillingTestAction accepts: which business, on or off, and an optional note.
 * `enabled` must be a real boolean — no truthy strings. Nothing about PayMe itself (keys, ids, prices) is ever
 * taken from the request.
 */
export const changeBusinessBillingTestSchema = z.object({
  businessId: z.string().min(1, "יש לציין מזהה עסק"),
  enabled: z.boolean({ message: "יש לבחור הפעלה או כיבוי" }),
  reason: z.string().trim().max(500, "הסיבה ארוכה מדי — עד 500 תווים").optional(),
});

export type ChangeBusinessBillingTestInput = z.infer<typeof changeBusinessBillingTestSchema>;

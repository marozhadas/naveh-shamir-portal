import { z } from "zod";
import { BUSINESS_PLAN_IDS } from "@/types/business-plan";

/** The only shape changeBusinessPlanAction accepts — newPlanId is never trusted as free text. */
export const changeBusinessPlanSchema = z.object({
  businessId: z.string().min(1, "יש לציין מזהה עסק"),
  newPlanId: z.enum(BUSINESS_PLAN_IDS as [string, ...string[]], { message: "יש לבחור חבילה מהרשימה בלבד" }),
  reason: z.string().trim().max(500, "הסיבה ארוכה מדי — עד 500 תווים").optional(),
});

export type ChangeBusinessPlanInput = z.infer<typeof changeBusinessPlanSchema>;

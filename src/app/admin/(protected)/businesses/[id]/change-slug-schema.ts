import { z } from "zod";
import { businessSlugSchema } from "@/utils/business-slug";

/** The only shape changeBusinessSlugAction accepts — newSlug is always re-validated against businessSlugSchema server-side, never trusted from the client's own validation. */
export const changeBusinessSlugSchema = z.object({
  businessId: z.string().min(1, "יש לציין מזהה עסק"),
  newSlug: businessSlugSchema,
});

export type ChangeBusinessSlugInput = z.infer<typeof changeBusinessSlugSchema>;

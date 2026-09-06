import type { z } from "zod";
import { plusBusinessRegistrationObjectSchema } from "@/app/business/register/plus/schema";

/**
 * What a business owner can change through their secret self-edit link — every field here is the
 * exact same rule as the Plus/Premium registration wizard (`plusBusinessRegistrationObjectSchema`),
 * just `.pick()`ed so drift between "what you can register with" and "what you can later edit" is
 * impossible. Deliberately excludes registrationId/planId (immutable) and every consent/plan field
 * (publicationConsent, termsAccepted, trialConsent, dashboardAccessConsent) — those stay
 * registration-time-only or admin-only, never self-editable.
 */
export const businessManagementEditObjectSchema = plusBusinessRegistrationObjectSchema.pick({
  businessName: true,
  categoryIds: true,
  businessType: true,
  publicPhone: true,
  publicWhatsapp: true,
  publicEmail: true,
  shortDescription: true,
  fullDescription: true,
  addressType: true,
  address: true,
  serviceArea: true,
  coverImage: true,
  gallery: true,
  services: true,
  testimonials: true,
  openingHours: true,
  websiteUrl: true,
  instagramUrl: true,
  facebookUrl: true,
  tiktokUrl: true,
  promotion: true,
});

export const businessManagementEditSchema = businessManagementEditObjectSchema.superRefine((values, ctx) => {
  if (values.addressType !== "service-area" && !values.address) {
    ctx.addIssue({ code: "custom", path: ["address"], message: "יש להזין כתובת" });
  }
  if (values.addressType !== "physical" && !values.serviceArea) {
    ctx.addIssue({ code: "custom", path: ["serviceArea"], message: "יש להזין אזור שירות" });
  }
});

export type BusinessManagementEditValues = z.infer<typeof businessManagementEditSchema>;

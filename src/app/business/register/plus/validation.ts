import type { z } from "zod";
import {
  plusStepOneSchema,
  plusStepTwoSchema,
  plusStepThreeSchema,
  plusStepFourSchema,
  plusStepFiveSchema,
  serviceSchema,
  testimonialSchema,
  openingHoursDaySchema,
  WEEKDAYS,
  WEEKDAY_LABEL,
} from "./schema";

export type WizardErrors = Record<string, string>;

/** First error message per top-level field — mirrors the flatten().fieldErrors shape used everywhere else in this codebase. */
function firstFieldErrors(error: z.ZodError): WizardErrors {
  const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const out: WizardErrors = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages && messages[0]) out[key] = messages[0];
  }
  return out;
}

export type StepOneInput = {
  businessName: string;
  categoryIds: string[];
  businessType: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  addressType: "physical" | "service-area" | "both";
  address: string;
  serviceArea: string;
};

export function validateStepOne(input: StepOneInput): WizardErrors {
  const result = plusStepOneSchema.safeParse(input);
  return result.success ? {} : firstFieldErrors(result.error);
}

export type StepTwoInput = {
  coverImage: { url: string; alt: string } | null;
  shortDescription: string;
  fullDescription: string;
};

export function validateStepTwo(input: StepTwoInput): WizardErrors {
  const errors: WizardErrors = {};
  if (!input.coverImage) errors.coverImage = "יש להעלות תמונה ראשית";
  const rest = plusStepTwoSchema.safeParse({
    coverImage: input.coverImage ?? { url: "placeholder", alt: "" },
    shortDescription: input.shortDescription,
    fullDescription: input.fullDescription,
  });
  if (!rest.success) {
    const restErrors = firstFieldErrors(rest.error);
    delete restErrors.coverImage; // already handled above with a friendlier message than the raw shape error
    Object.assign(errors, restErrors);
  }
  return errors;
}

export type ServiceDraft = { title: string; description: string; priceLabel: string };
export type TestimonialDraft = { authorName: string; text: string; roleOrContext: string };

/**
 * Error keys match the DOM ids already used in the wizard's JSX (service-title-0, service-desc-0,
 * testimonial-author-0, ...), so focusFirstInvalidField needs no extra mapping table for these.
 * `testimonials` defaults to [] so existing callers (e.g. tests) that only pass services still work.
 */
export function validateStepThree(services: ServiceDraft[], testimonials: TestimonialDraft[] = []): WizardErrors {
  const errors: WizardErrors = {};
  const arrayCheck = plusStepThreeSchema.safeParse({ services, testimonials });
  if (!arrayCheck.success) {
    // Only a genuine array-level issue (path.length === 1, e.g. min/max count) belongs on the
    // "services"/"testimonials" key itself. z.array(itemSchema) also validates every item, and
    // Zod's flatten() groups ALL issues by their path's first segment — so a per-item issue like
    // services.0.title would otherwise get grouped under "services" too, even though it's already
    // reported precisely as service-title-{index} below. That false positive used to make
    // "services"/"testimonials" (which have no matching DOM element) win the first-invalid-field
    // lookup ahead of the real field, silently breaking focus. Reading .issues directly (instead of
    // .flatten()) keeps only true array-level issues here.
    for (const issue of arrayCheck.error.issues) {
      if (issue.path.length !== 1) continue;
      if (issue.path[0] === "services" && !errors.services) errors.services = issue.message;
      if (issue.path[0] === "testimonials" && !errors.testimonials) errors.testimonials = issue.message;
    }
  }
  services.forEach((service, index) => {
    const result = serviceSchema.safeParse(service);
    if (result.success) return;
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === "title" && !errors[`service-title-${index}`]) errors[`service-title-${index}`] = issue.message;
      if (field === "description" && !errors[`service-desc-${index}`]) errors[`service-desc-${index}`] = issue.message;
      if (field === "priceLabel" && !errors[`service-price-${index}`]) errors[`service-price-${index}`] = issue.message;
    }
  });
  testimonials.forEach((testimonial, index) => {
    const result = testimonialSchema.safeParse({
      authorName: testimonial.authorName,
      text: testimonial.text,
      roleOrContext: testimonial.roleOrContext || undefined,
    });
    if (result.success) return;
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === "authorName" && !errors[`testimonial-author-${index}`]) errors[`testimonial-author-${index}`] = issue.message;
      if (field === "text" && !errors[`testimonial-text-${index}`]) errors[`testimonial-text-${index}`] = issue.message;
      if (field === "roleOrContext" && !errors[`testimonial-role-${index}`]) errors[`testimonial-role-${index}`] = issue.message;
    }
  });
  return errors;
}

export type Interval = { opensAt: string; closesAt: string };
export type DayHours = { closed: boolean; intervals: Interval[] };
export type HoursState = Record<(typeof WEEKDAYS)[number], DayHours>;

export type StepFourInput = {
  publicPhone: string;
  publicWhatsapp: string;
  publicEmail: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  openingHours: HoursState;
};

/** Error keys for hours are `hours_<day>` — the DOM id is `hours-<day>` (see focusFirstInvalidField's key-to-id mapping). */
export function validateStepFour(input: StepFourInput): WizardErrors {
  const errors: WizardErrors = {};
  const fieldCheck = plusStepFourSchema.safeParse({
    publicPhone: input.publicPhone,
    publicWhatsapp: input.publicWhatsapp,
    publicEmail: input.publicEmail,
    websiteUrl: input.websiteUrl,
    instagramUrl: input.instagramUrl,
    facebookUrl: input.facebookUrl,
    tiktokUrl: input.tiktokUrl,
  });
  if (!fieldCheck.success) Object.assign(errors, firstFieldErrors(fieldCheck.error));

  for (const day of WEEKDAYS) {
    const dayValue = input.openingHours[day];
    const result = openingHoursDaySchema.safeParse({ day, closed: dayValue.closed, intervals: dayValue.intervals });
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "השעות אינן תקינות";
      errors[`hours_${day}`] = `${WEEKDAY_LABEL[day]} — ${message}`;
    }
  }
  return errors;
}

export type StepFiveInput = {
  publicationConsent: boolean;
  termsAccepted: boolean;
  trialConsent: boolean;
  dashboardAccessConsent: boolean;
};

export function validateStepFive(input: StepFiveInput, planId: "plus" | "premium"): WizardErrors {
  const result = plusStepFiveSchema(planId).safeParse(input);
  return result.success ? {} : firstFieldErrors(result.error);
}

/** Which wizard step (1-5) a given error key belongs to — drives the progress indicator's error state and where "final submit" jumps to. */
export function stepForErrorKey(key: string): number {
  if (key.startsWith("service")) return 3;
  if (key.startsWith("testimonial")) return 3;
  if (key.startsWith("hours_")) return 4;
  const STEP_ONE = new Set(["businessName", "categoryIds", "businessType", "contactName", "contactPhone", "contactEmail", "addressType", "address", "serviceArea"]);
  const STEP_TWO = new Set(["coverImage", "gallery", "shortDescription", "fullDescription"]);
  const STEP_FOUR = new Set(["publicPhone", "publicWhatsapp", "publicEmail", "websiteUrl", "instagramUrl", "facebookUrl", "tiktokUrl", "openingHours"]);
  const STEP_FIVE = new Set(["publicationConsent", "termsAccepted", "trialConsent", "dashboardAccessConsent"]);
  if (STEP_ONE.has(key)) return 1;
  if (STEP_TWO.has(key)) return 2;
  if (key === "services") return 3;
  if (STEP_FOUR.has(key)) return 4;
  if (STEP_FIVE.has(key)) return 5;
  return 5;
}

/** The first step (1-5, in order) that has at least one error key — used to jump the wizard there after a full-form validation failure (client-caught or server-rejected). */
export function getFirstInvalidStep(errors: WizardErrors): number | null {
  if (Object.keys(errors).length === 0) return null;
  let min = 6;
  for (const key of Object.keys(errors)) {
    const step = stepForErrorKey(key);
    if (step < min) min = step;
  }
  return min === 6 ? null : min;
}

/** DOM element id for a given error key — matches the ids already rendered in PlusRegistrationWizard.tsx. */
export function errorKeyToElementId(key: string): string {
  if (key.startsWith("hours_")) return `hours-${key.slice("hours_".length)}`;
  if (key === "categoryIds") return "category-label";
  return key;
}

/** Whether `errors` contains at least one key belonging to `step`. */
export function stepHasError(errors: WizardErrors, step: number): boolean {
  return Object.keys(errors).some((key) => stepForErrorKey(key) === step);
}

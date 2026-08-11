"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getVisibleBusinessCategories } from "@/data/business-categories";
import { uploadBusinessMediaAction, submitPlusRegistrationAction, submitPremiumRegistrationAction } from "./actions";
import { BUSINESS_TYPE_OPTIONS, WEEKDAYS, WEEKDAY_LABEL } from "./schema";
import {
  validateStepOne,
  validateStepTwo,
  validateStepThree,
  validateStepFour,
  validateStepFive,
  getFirstInvalidStep,
  stepHasError,
  errorKeyToElementId,
  type WizardErrors,
} from "./validation";
import type { PlusBusinessRegistrationInput } from "@/types/business-plus-registration";
import styles from "./plus-wizard.module.css";

const CATEGORIES = getVisibleBusinessCategories();
const DRAFT_KEY_BY_PLAN = {
  plus: "naveh-shamir-plus-registration-draft-v1",
  premium: "naveh-shamir-premium-registration-draft-v1",
} as const;

const STEP_LABELS = ["פרטי העסק", "תמונות ותיאור", "שירותים", "שעות ופרטי קשר", "בדיקה ושליחה"];

type GalleryImage = { url: string; alt: string };
type ServiceDraft = { title: string; description: string; priceLabel: string };
type TestimonialDraft = { authorName: string; text: string; roleOrContext: string };
type Interval = { opensAt: string; closesAt: string };
type DayHours = { closed: boolean; intervals: Interval[] };
type HoursState = Record<(typeof WEEKDAYS)[number], DayHours>;

type WizardValues = {
  businessName: string;
  categoryIds: string[];
  businessType: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  addressType: "physical" | "service-area" | "both";
  address: string;
  serviceArea: string;
  coverImage: GalleryImage | null;
  gallery: GalleryImage[];
  shortDescription: string;
  fullDescription: string;
  services: ServiceDraft[];
  testimonials: TestimonialDraft[];
  openingHours: HoursState;
  publicPhone: string;
  whatsappSameAsPublicPhone: boolean;
  publicWhatsapp: string;
  publicEmail: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  promotionEnabled: boolean;
  promotionTitle: string;
  promotionDescription: string;
  promotionValidUntil: string;
  publicationConsent: boolean;
  termsAccepted: boolean;
  trialConsent: boolean;
  dashboardAccessConsent: boolean;
  honeypot: string;
};

const FIELD_LABEL: Record<string, string> = {
  businessName: "שם העסק",
  categoryIds: "קטגוריה",
  businessType: "סוג העסק",
  contactName: "שם איש/אשת קשר",
  contactPhone: "טלפון",
  contactEmail: "אימייל",
  address: "כתובת",
  serviceArea: "אזור שירות",
  coverImage: "תמונה ראשית",
  gallery: "גלריית תמונות",
  shortDescription: "תיאור קצר",
  fullDescription: "תיאור מלא",
  services: "שירותים",
  testimonials: "המלצות",
  publicPhone: "טלפון ציבורי",
  publicWhatsapp: "WhatsApp ציבורי",
  publicEmail: "אימייל עסקי",
  websiteUrl: "אתר",
  instagramUrl: "Instagram",
  facebookUrl: "Facebook",
  tiktokUrl: "TikTok",
  publicationConsent: "אישור פרסום הפרטים",
  termsAccepted: "אישור תנאי השימוש",
  trialConsent: "אישור חודש הניסיון",
  dashboardAccessConsent: "אישור גישה לאזור האישי",
};

/** Human label for an error key shown in a step's error summary — services/hours get a dynamic, position-aware label instead of a static lookup. */
function labelForErrorKey(key: string): string {
  if (key.startsWith("service-title-")) return `שירות ${Number(key.split("-")[2]) + 1} — שם השירות`;
  if (key.startsWith("service-desc-")) return `שירות ${Number(key.split("-")[2]) + 1} — תיאור`;
  if (key.startsWith("service-price-")) return `שירות ${Number(key.split("-")[2]) + 1} — מחיר`;
  if (key.startsWith("testimonial-author-")) return `המלצה ${Number(key.split("-")[2]) + 1} — שם הממליץ/ה`;
  if (key.startsWith("testimonial-text-")) return `המלצה ${Number(key.split("-")[2]) + 1} — תוכן ההמלצה`;
  if (key.startsWith("testimonial-role-")) return `המלצה ${Number(key.split("-")[2]) + 1} — תפקיד/הקשר`;
  if (key.startsWith("hours_")) {
    const day = key.slice("hours_".length) as (typeof WEEKDAYS)[number];
    return `שעות פעילות — יום ${WEEKDAY_LABEL[day]}`;
  }
  return FIELD_LABEL[key] ?? key;
}

function createEmptyHours(): HoursState {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day] = { closed: day === "saturday", intervals: [{ opensAt: "09:00", closesAt: "18:00" }] };
    return acc;
  }, {} as HoursState);
}

function createEmptyValues(): WizardValues {
  return {
    businessName: "",
    categoryIds: [],
    businessType: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    addressType: "physical",
    address: "",
    serviceArea: "",
    coverImage: null,
    gallery: [],
    shortDescription: "",
    fullDescription: "",
    services: [{ title: "", description: "", priceLabel: "" }],
    testimonials: [],
    openingHours: createEmptyHours(),
    publicPhone: "",
    whatsappSameAsPublicPhone: true,
    publicWhatsapp: "",
    publicEmail: "",
    websiteUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    promotionEnabled: false,
    promotionTitle: "",
    promotionDescription: "",
    promotionValidUntil: "",
    publicationConsent: false,
    termsAccepted: false,
    trialConsent: false,
    dashboardAccessConsent: false,
    honeypot: "",
  };
}

/** Removes every error key that belongs to `step` from `errors` — used before merging in that step's freshly-computed errors, so other steps' stored errors are left untouched. */
function stripStepErrors(errors: WizardErrors, step: number, stepKeys: string[]): WizardErrors {
  const stepKeySet = new Set(stepKeys);
  const next: WizardErrors = {};
  for (const [key, value] of Object.entries(errors)) {
    if (!stepKeySet.has(key)) next[key] = value;
  }
  return next;
}

function omitKey(errors: WizardErrors, key: string): WizardErrors {
  const next = { ...errors };
  delete next[key];
  return next;
}

function focusAndReveal(elementId: string) {
  const node = document.getElementById(elementId);
  if (!node) return;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  node.focus();
  node.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
}

type PlusRegistrationWizardProps = {
  planId: "plus" | "premium";
  priceLabel: string;
};

export function PlusRegistrationWizard({ planId, priceLabel }: PlusRegistrationWizardProps) {
  const router = useRouter();
  const draftKey = DRAFT_KEY_BY_PLAN[planId];
  const registrationIdRef = useRef<string>(crypto.randomUUID());
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<WizardValues>(createEmptyValues);
  const [errors, setErrors] = useState<WizardErrors>({});
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(new Set());
  const [draftRestored, setDraftRestored] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasLoadedDraftRef = useRef(false);

  // Restore a draft once on mount — same one-time-external-read pattern used by RegisterBusinessForm.
  useEffect(() => {
    if (hasLoadedDraftRef.current) return;
    hasLoadedDraftRef.current = true;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { step: number; values: WizardValues };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from sessionStorage on mount, not a prop/state sync
      setValues((current) => ({ ...current, ...parsed.values }));
      setStep(parsed.step ?? 1);
      setDraftRestored(true);
    } catch {
      // Corrupt/unavailable storage — start fresh.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draftKey is derived from the planId prop, stable for the component's lifetime; only run once on mount
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({ step, values }));
      } catch {
        // Storage full/unavailable — a convenience feature, not worth surfacing an error for.
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [step, values, draftKey]);

  function clearDraft() {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // Nothing to do if storage is unavailable.
    }
  }

  // ---- Per-step validation (single source of truth: the Zod schemas in ./schema, via ./validation) ----

  function computeStepErrors(stepNumber: number, source: WizardValues): WizardErrors {
    switch (stepNumber) {
      case 1:
        return validateStepOne(source);
      case 2:
        return validateStepTwo(source);
      case 3:
        return validateStepThree(source.services, source.testimonials);
      case 4: {
        const effectiveWhatsapp = source.whatsappSameAsPublicPhone ? "" : source.publicWhatsapp;
        return validateStepFour({ ...source, publicWhatsapp: effectiveWhatsapp });
      }
      case 5:
        return validateStepFive(source, planId);
      default:
        return {};
    }
  }

  const STEP_KEYS: Record<number, string[]> = useMemo(
    () => ({
      1: ["businessName", "categoryIds", "businessType", "contactName", "contactPhone", "contactEmail", "address", "serviceArea"],
      2: ["coverImage", "gallery", "shortDescription", "fullDescription"],
      3: [
        "services",
        ...values.services.flatMap((_, i) => [`service-title-${i}`, `service-desc-${i}`, `service-price-${i}`]),
        "testimonials",
        ...values.testimonials.flatMap((_, i) => [`testimonial-author-${i}`, `testimonial-text-${i}`, `testimonial-role-${i}`]),
      ],
      4: ["publicPhone", "publicWhatsapp", "publicEmail", "websiteUrl", "instagramUrl", "facebookUrl", "tiktokUrl", ...WEEKDAYS.map((d) => `hours_${d}`)],
      5: ["publicationConsent", "termsAccepted", "trialConsent", "dashboardAccessConsent"],
    }),
    [values.services, values.testimonials],
  );

  /** Runs the given step's validation, merges its errors into the shared error state (only replacing that step's own keys — other steps' stored errors are untouched), and returns whether it passed. */
  function runAndMergeStepValidation(stepNumber: number, source: WizardValues): boolean {
    const stepErrors = computeStepErrors(stepNumber, source);
    setErrors((current) => ({ ...stripStepErrors(current, stepNumber, STEP_KEYS[stepNumber] ?? []), ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  }

  function firstInvalidFieldId(stepErrors: WizardErrors, stepNumber: number): string | null {
    const order = STEP_KEYS[stepNumber] ?? [];
    const firstKey = order.find((key) => stepErrors[key]);
    return firstKey ? errorKeyToElementId(firstKey) : null;
  }

  function update<K extends keyof WizardValues>(key: K, value: WizardValues[K]) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (attemptedSteps.has(step)) {
        // Live re-validation after a first failed attempt: fixed fields lose their error immediately,
        // without waiting for another "המשך" click.
        queueMicrotask(() => runAndMergeStepValidation(step, next));
      }
      return next;
    });
  }

  function goNext() {
    setAttemptedSteps((current) => new Set(current).add(step));
    const passed = runAndMergeStepValidation(step, values);
    if (!passed) {
      const stepErrors = computeStepErrors(step, values);
      const firstId = firstInvalidFieldId(stepErrors, step);
      if (firstId) focusAndReveal(firstId);
      return;
    }
    setStep((s) => Math.min(5, s + 1));
    focusAndReveal("wizard-step-heading");
  }

  function goToStep(target: number) {
    setStep(target);
    focusAndReveal("wizard-step-heading");
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
    focusAndReveal("wizard-step-heading");
  }

  async function handleCoverUpload(file: File) {
    setUploadingCover(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadBusinessMediaAction(registrationIdRef.current, "cover", formData);
    setUploadingCover(false);
    if (!result.success) {
      setErrors((e) => ({ ...e, coverImage: result.message }));
      return;
    }
    setErrors((e) => omitKey(e, "coverImage"));
    update("coverImage", { url: result.url, alt: values.businessName || "תמונת העסק" });
  }

  async function handleGalleryUpload(files: FileList) {
    if (values.gallery.length >= 7) return;
    const remaining = 7 - values.gallery.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      setErrors((e) => ({ ...e, gallery: `ניתן להעלות עד 8 תמונות בסך הכול (כולל התמונה הראשית) — הועלו רק ${remaining} התמונות הראשונות שבחרתם.` }));
    } else {
      setErrors((e) => omitKey(e, "gallery"));
    }
    setUploadingGallery(true);
    for (const file of toUpload) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadBusinessMediaAction(registrationIdRef.current, "gallery", formData);
      if (result.success) {
        setValues((current) => ({
          ...current,
          gallery: [...current.gallery, { url: result.url, alt: current.businessName || "תמונה מהגלריה" }],
        }));
      } else {
        setErrors((e) => ({ ...e, gallery: result.message }));
      }
    }
    setUploadingGallery(false);
  }

  function removeGalleryImage(index: number) {
    setValues((current) => ({ ...current, gallery: current.gallery.filter((_, i) => i !== index) }));
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    setValues((current) => {
      const next = [...current.gallery];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, gallery: next };
    });
  }

  function updateService(index: number, patch: Partial<ServiceDraft>) {
    setValues((current) => {
      const next = { ...current, services: current.services.map((s, i) => (i === index ? { ...s, ...patch } : s)) };
      if (attemptedSteps.has(step)) queueMicrotask(() => runAndMergeStepValidation(step, next));
      return next;
    });
  }

  function addService() {
    if (values.services.length >= 12) return;
    setValues((current) => ({ ...current, services: [...current.services, { title: "", description: "", priceLabel: "" }] }));
  }

  function removeService(index: number) {
    setValues((current) => {
      const next = { ...current, services: current.services.filter((_, i) => i !== index) };
      if (attemptedSteps.has(step)) queueMicrotask(() => runAndMergeStepValidation(step, next));
      return next;
    });
  }

  function moveService(index: number, direction: -1 | 1) {
    setValues((current) => {
      const next = [...current.services];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, services: next };
    });
  }

  function updateTestimonial(index: number, patch: Partial<TestimonialDraft>) {
    setValues((current) => {
      const next = { ...current, testimonials: current.testimonials.map((t, i) => (i === index ? { ...t, ...patch } : t)) };
      if (attemptedSteps.has(step)) queueMicrotask(() => runAndMergeStepValidation(step, next));
      return next;
    });
  }

  function addTestimonial() {
    if (values.testimonials.length >= 10) return;
    setValues((current) => ({ ...current, testimonials: [...current.testimonials, { authorName: "", text: "", roleOrContext: "" }] }));
  }

  function removeTestimonial(index: number) {
    setValues((current) => {
      const next = { ...current, testimonials: current.testimonials.filter((_, i) => i !== index) };
      if (attemptedSteps.has(step)) queueMicrotask(() => runAndMergeStepValidation(step, next));
      return next;
    });
  }

  function moveTestimonial(index: number, direction: -1 | 1) {
    setValues((current) => {
      const next = [...current.testimonials];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, testimonials: next };
    });
  }

  function updateDayHours(day: (typeof WEEKDAYS)[number], patch: Partial<DayHours>) {
    setValues((current) => {
      const next = { ...current, openingHours: { ...current.openingHours, [day]: { ...current.openingHours[day], ...patch } } };
      if (attemptedSteps.has(step)) queueMicrotask(() => runAndMergeStepValidation(step, next));
      return next;
    });
  }

  function copyHoursToAllDays(day: (typeof WEEKDAYS)[number]) {
    setValues((current) => {
      const source = current.openingHours[day];
      const nextHours = { ...current.openingHours };
      for (const d of WEEKDAYS) nextHours[d] = { closed: source.closed, intervals: source.intervals.map((i) => ({ ...i })) };
      const next = { ...current, openingHours: nextHours };
      if (attemptedSteps.has(step)) queueMicrotask(() => runAndMergeStepValidation(step, next));
      return next;
    });
  }

  const effectivePublicPhone = values.publicPhone || values.contactPhone;
  const effectivePublicWhatsapp = values.whatsappSameAsPublicPhone ? effectivePublicPhone : values.publicWhatsapp;

  async function handleSubmit() {
    // Full-form check across ALL steps before ever touching the server — this is what closes the
    // original bug: previously only the current (5th) step was validated here, so an invalid field
    // left behind in an earlier step surfaced only as a generic, un-locatable server error.
    setAttemptedSteps(new Set([1, 2, 3, 4, 5]));
    const allErrors: WizardErrors = {
      ...computeStepErrors(1, values),
      ...computeStepErrors(2, values),
      ...computeStepErrors(3, values),
      ...computeStepErrors(4, values),
      ...computeStepErrors(5, values),
    };
    setErrors(allErrors);
    const firstInvalidStep = getFirstInvalidStep(allErrors);
    if (firstInvalidStep !== null) {
      setStep(firstInvalidStep);
      const stepErrors = computeStepErrors(firstInvalidStep, values);
      const firstId = firstInvalidFieldId(stepErrors, firstInvalidStep);
      // Wait for the step switch to render before focusing its field.
      setTimeout(() => {
        if (firstId) focusAndReveal(firstId);
        else focusAndReveal("wizard-step-heading");
      }, 0);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const input: PlusBusinessRegistrationInput = {
      registrationId: registrationIdRef.current,
      planId,
      businessName: values.businessName.trim(),
      categoryIds: values.categoryIds,
      businessType: values.businessType,
      contactName: values.contactName.trim(),
      contactPhone: values.contactPhone.trim(),
      contactEmail: values.contactEmail.trim(),
      publicPhone: effectivePublicPhone.trim(),
      publicWhatsapp: effectivePublicWhatsapp.trim(),
      publicEmail: values.publicEmail.trim(),
      shortDescription: values.shortDescription.trim(),
      fullDescription: values.fullDescription.trim(),
      addressType: values.addressType,
      address: values.address.trim(),
      serviceArea: values.serviceArea.trim(),
      coverImage: values.coverImage,
      gallery: values.gallery.map((image, index) => ({ ...image, order: index })),
      services: values.services
        .filter((s) => s.title.trim())
        .map((s) => ({
          title: s.title.trim(),
          description: s.description.trim() || undefined,
          priceLabel: s.priceLabel.trim() || undefined,
        })),
      testimonials: values.testimonials
        .filter((t) => t.authorName.trim() && t.text.trim())
        .map((t) => ({
          authorName: t.authorName.trim(),
          text: t.text.trim(),
          roleOrContext: t.roleOrContext.trim() || undefined,
        })),
      openingHours: WEEKDAYS.map((day) => ({ day, closed: values.openingHours[day].closed, intervals: values.openingHours[day].intervals })),
      websiteUrl: values.websiteUrl.trim(),
      socialLinks: {
        instagramUrl: values.instagramUrl.trim() || undefined,
        facebookUrl: values.facebookUrl.trim() || undefined,
        tiktokUrl: values.tiktokUrl.trim() || undefined,
      },
      promotion:
        values.promotionEnabled && values.promotionTitle.trim()
          ? { title: values.promotionTitle.trim(), description: values.promotionDescription.trim() || undefined, validUntil: values.promotionValidUntil || undefined }
          : null,
      publicationConsent: values.publicationConsent,
      termsAccepted: values.termsAccepted,
      trialConsent: values.trialConsent,
      dashboardAccessConsent: planId === "premium" ? values.dashboardAccessConsent : undefined,
    };

    const submitAction = planId === "premium" ? submitPremiumRegistrationAction : submitPlusRegistrationAction;
    const result = await submitAction(input, values.honeypot);
    setSubmitting(false);

    if (result.status === "success") {
      clearDraft();
      router.push(`/business/register/success?plan=${planId}`);
      return;
    }
    if (result.status === "validation-error") {
      // Server rejected something the client didn't catch (defense in depth) — never surface this as
      // a dangling generic message: map every offending field back to its owning step and jump there.
      const serverErrors = Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v[0]]));
      setErrors((e) => ({ ...e, ...serverErrors }));
      setSubmitError(result.message ?? null);
      const serverInvalidStep = getFirstInvalidStep(serverErrors);
      if (serverInvalidStep !== null) {
        setStep(serverInvalidStep);
        setTimeout(() => focusAndReveal("wizard-step-heading"), 0);
      }
      return;
    }
    setSubmitError(result.message ?? "אירעה שגיאה. נסו שוב.");
  }

  const shortDescCount = `${values.shortDescription.length} תווים (עד 300 תווים)`;
  const fullDescCount = `${values.fullDescription.length} תווים (מינימום 100)`;

  const currentStepErrorKeys = (STEP_KEYS[step] ?? []).filter((key) => errors[key]);

  return (
    <div>
      {draftRestored && step === 1 && <p className={styles.draftNotice}>שחזרנו את הפרטים שמילאתם</p>}

      <ol className={styles.progress}>
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          const hasError = stepHasError(errors, stepNumber);
          const stateClass = hasError ? styles.error : stepNumber === step ? styles.active : stepNumber < step ? styles.done : "";
          return (
            <li key={label} className={`${styles.progressStep} ${stateClass}`}>
              <div className={styles.progressBar} />
              <span className={styles.progressLabel}>
                <span className={styles.progressStepIcon} aria-hidden="true">
                  {hasError ? "!" : stepNumber < step ? "✓" : stepNumber}
                </span>
                {label}
                <span className="sr-only">{hasError ? " — יש שגיאות בשלב זה" : stepNumber < step ? " — הושלם" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {submitError && (
        <p className={styles.error} role="alert">
          {submitError}
        </p>
      )}

      {currentStepErrorKeys.length > 0 && (
        <div className={styles.summary} role="alert" aria-live="assertive">
          <p className={styles.summaryTitle}>יש כמה פרטים שצריך לתקן</p>
          <p className={styles.summaryDescription}>כל מה שמילאתם נשמר. עברו על השדות המסומנים והשלימו את החסר.</p>
          <ul className={styles.summaryList}>
            {currentStepErrorKeys.map((key) => (
              <li key={key}>
                <a
                  href={`#${errorKeyToElementId(key)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    focusAndReveal(errorKeyToElementId(key));
                  }}
                >
                  {labelForErrorKey(key)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.stepCard}>
        {step === 1 && (
          <>
            <h2 id="wizard-step-heading" tabIndex={-1} className={styles.stepTitle}>
              ספרו לנו על העסק
            </h2>

            <div className={`${styles.field} ${errors.businessName ? styles.fieldInvalid : ""}`}>
              <label htmlFor="businessName">שם העסק *</label>
              <input
                id="businessName"
                type="text"
                placeholder="לדוגמה: המאפייה של רוני"
                value={values.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                aria-invalid={Boolean(errors.businessName)}
                aria-describedby={errors.businessName ? "businessName-error" : undefined}
              />
              {errors.businessName && (
                <p id="businessName-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.businessName}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label id="category-label" tabIndex={-1}>
                קטגוריה *
              </label>
              <div className={styles.categoryGrid} role="group" aria-labelledby="category-label">
                {CATEGORIES.map((category) => {
                  const selected = values.categoryIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`${styles.categoryChip} ${selected ? styles.selected : ""}`}
                      aria-pressed={selected}
                      onClick={() =>
                        update(
                          "categoryIds",
                          selected ? values.categoryIds.filter((id) => id !== category.id) : [...values.categoryIds, category.id],
                        )
                      }
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
              {errors.categoryIds && (
                <p id="categoryIds-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.categoryIds}
                </p>
              )}
            </div>

            <div className={`${styles.field} ${errors.businessType ? styles.fieldInvalid : ""}`}>
              <label htmlFor="businessType">סוג העסק *</label>
              <select
                id="businessType"
                value={values.businessType}
                onChange={(e) => update("businessType", e.target.value)}
                aria-invalid={Boolean(errors.businessType)}
                aria-describedby={errors.businessType ? "businessType-error" : undefined}
              >
                <option value="" disabled>
                  בחרו סוג עסק
                </option>
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.businessType && (
                <p id="businessType-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.businessType}
                </p>
              )}
            </div>

            <div className={`${styles.field} ${errors.contactName ? styles.fieldInvalid : ""}`}>
              <label htmlFor="contactName">שם איש/אשת קשר *</label>
              <input
                id="contactName"
                type="text"
                value={values.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                aria-invalid={Boolean(errors.contactName)}
                aria-describedby={errors.contactName ? "contactName-error" : undefined}
              />
              <p className={styles.hintText}>המידע מיועד לניהול ההרשמה ולא בהכרח יוצג באתר.</p>
              {errors.contactName && (
                <p id="contactName-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.contactName}
                </p>
              )}
            </div>

            <div className={styles.row}>
              <div className={`${styles.field} ${errors.contactPhone ? styles.fieldInvalid : ""}`}>
                <label htmlFor="contactPhone">טלפון *</label>
                <input
                  id="contactPhone"
                  type="tel"
                  dir="ltr"
                  placeholder="+972500000000"
                  value={values.contactPhone}
                  onChange={(e) => update("contactPhone", e.target.value)}
                  aria-invalid={Boolean(errors.contactPhone)}
                  aria-describedby={errors.contactPhone ? "contactPhone-error" : undefined}
                />
                {errors.contactPhone && (
                  <p id="contactPhone-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.contactPhone}
                  </p>
                )}
              </div>
              <div className={`${styles.field} ${errors.contactEmail ? styles.fieldInvalid : ""}`}>
                <label htmlFor="contactEmail">אימייל *</label>
                <input
                  id="contactEmail"
                  type="email"
                  dir="ltr"
                  value={values.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                  aria-invalid={Boolean(errors.contactEmail)}
                  aria-describedby={errors.contactEmail ? "contactEmail-error" : undefined}
                />
                <p className={styles.hintText}>ישמש לעדכונים בנוגע להרשמה ולמנוי.</p>
                {errors.contactEmail && (
                  <p id="contactEmail-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.contactEmail}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label id="address-type-label">כתובת או אזור שירות</label>
              <select
                aria-labelledby="address-type-label"
                value={values.addressType}
                onChange={(e) => update("addressType", e.target.value as WizardValues["addressType"])}
              >
                <option value="physical">יש לי כתובת פיזית</option>
                <option value="service-area">אני נותן/ת שירות באזור מסוים</option>
                <option value="both">גם כתובת וגם אזור שירות</option>
              </select>
            </div>

            {values.addressType !== "service-area" && (
              <div className={`${styles.field} ${errors.address ? styles.fieldInvalid : ""}`}>
                <label htmlFor="address">כתובת</label>
                <input
                  id="address"
                  type="text"
                  value={values.address}
                  onChange={(e) => update("address", e.target.value)}
                  aria-invalid={Boolean(errors.address)}
                  aria-describedby={errors.address ? "address-error" : undefined}
                />
                {errors.address && (
                  <p id="address-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.address}
                  </p>
                )}
              </div>
            )}
            {values.addressType !== "physical" && (
              <div className={`${styles.field} ${errors.serviceArea ? styles.fieldInvalid : ""}`}>
                <label htmlFor="serviceArea">אזור שירות</label>
                <input
                  id="serviceArea"
                  type="text"
                  value={values.serviceArea}
                  onChange={(e) => update("serviceArea", e.target.value)}
                  aria-invalid={Boolean(errors.serviceArea)}
                  aria-describedby={errors.serviceArea ? "serviceArea-error" : undefined}
                />
                {errors.serviceArea && (
                  <p id="serviceArea-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.serviceArea}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 id="wizard-step-heading" tabIndex={-1} className={styles.stepTitle}>
              בואו נראה ללקוחות מה מיוחד בעסק
            </h2>

            <div className={`${styles.imageUpload} ${errors.coverImage ? styles.fieldInvalid : ""}`}>
              <label id="coverImage-label">תמונה ראשית *</label>
              <p className={styles.hintText}>זו התמונה המרכזית שתופיע בכרטיס העסק ובעמוד העסק. יחס מומלץ 16:9. JPG, PNG או WebP, עד 5MB.</p>
              {values.coverImage ? (
                <div className={styles.imagePreviewGrid}>
                  <div className={styles.imagePreview}>
                    <img src={values.coverImage.url} alt={values.coverImage.alt} />
                    <button type="button" className={styles.imageRemoveButton} aria-label="הסרת התמונה הראשית" onClick={() => update("coverImage", null)}>
                      ×
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  id="coverImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="העלאת תמונה ראשית"
                  aria-invalid={Boolean(errors.coverImage)}
                  aria-describedby={errors.coverImage ? "coverImage-error" : undefined}
                  disabled={uploadingCover}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverUpload(file);
                  }}
                />
              )}
              {uploadingCover && <p className={styles.hintText}>מעלה תמונה…</p>}
              {errors.coverImage && (
                <p id="coverImage-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.coverImage}
                </p>
              )}
            </div>

            <div className={styles.imageUpload}>
              <label id="gallery-label">גלריית תמונות (עד 8 תמונות כולל התמונה הראשית)</label>
              <div className={styles.imagePreviewGrid}>
                {values.gallery.map((image, index) => (
                  <div key={image.url} className={styles.imagePreview}>
                    <img src={image.url} alt={image.alt} />
                    <button type="button" className={styles.imageRemoveButton} aria-label={`הסרת תמונה ${index + 1}`} onClick={() => removeGalleryImage(index)}>
                      ×
                    </button>
                    <div className={styles.imageMoveButtons}>
                      <Button variant="secondary" size="compact" type="button" disabled={index === 0} onClick={() => moveGalleryImage(index, -1)}>
                        ‹
                      </Button>
                      <Button
                        variant="secondary"
                        size="compact"
                        type="button"
                        disabled={index === values.gallery.length - 1}
                        onClick={() => moveGalleryImage(index, 1)}
                      >
                        ›
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {values.gallery.length < 7 && (
                <input
                  id="gallery"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  aria-label="הוספת תמונות לגלריה"
                  aria-describedby={errors.gallery ? "gallery-error" : undefined}
                  disabled={uploadingGallery}
                  onChange={(e) => {
                    if (e.target.files?.length) void handleGalleryUpload(e.target.files);
                  }}
                />
              )}
              {uploadingGallery && <p className={styles.hintText}>מעלה תמונות…</p>}
              {errors.gallery && (
                <p id="gallery-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.gallery}
                </p>
              )}
            </div>

            <div className={`${styles.field} ${errors.shortDescription ? styles.fieldInvalid : ""}`}>
              <label htmlFor="shortDescription">תיאור קצר *</label>
              <p className={styles.hintText}>יופיע בכרטיס העסק באינדקס. עד 300 תווים.</p>
              <textarea
                id="shortDescription"
                rows={2}
                maxLength={300}
                value={values.shortDescription}
                onChange={(e) => update("shortDescription", e.target.value)}
                aria-invalid={Boolean(errors.shortDescription)}
                aria-describedby={errors.shortDescription ? "shortDescription-error" : undefined}
              />
              <span className={styles.charCount}>{shortDescCount}</span>
              {errors.shortDescription && (
                <p id="shortDescription-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.shortDescription}
                </p>
              )}
            </div>

            <div className={`${styles.field} ${errors.fullDescription ? styles.fieldInvalid : ""}`}>
              <label htmlFor="fullDescription">תיאור מלא *</label>
              <p className={styles.hintText}>ספרו ללקוחות מי אתם, מה אתם מציעים ומה מיוחד בעסק.</p>
              <textarea
                id="fullDescription"
                rows={6}
                maxLength={2000}
                value={values.fullDescription}
                onChange={(e) => update("fullDescription", e.target.value)}
                aria-invalid={Boolean(errors.fullDescription)}
                aria-describedby={errors.fullDescription ? "fullDescription-error" : undefined}
              />
              <span className={styles.charCount}>{fullDescCount}</span>
              {errors.fullDescription && (
                <p id="fullDescription-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.fullDescription}
                </p>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 id="wizard-step-heading" tabIndex={-1} className={styles.stepTitle}>
              אילו שירותים או מוצרים אתם מציעים?
            </h2>
            {errors.services && (
              <p className={styles.fieldErrorMessage} role="alert">
                {errors.services}
              </p>
            )}
            {values.services.map((service, index) => {
              const hasCardError = Boolean(errors[`service-title-${index}`] || errors[`service-desc-${index}`] || errors[`service-price-${index}`]);
              return (
                <div key={index} className={`${styles.serviceCard} ${hasCardError ? styles.invalid : ""}`}>
                  <div className={styles.serviceCardHeader}>
                    <span className={styles.hintText}>שירות {index + 1}</span>
                    <div className={styles.imageMoveButtons}>
                      <Button variant="secondary" size="compact" type="button" disabled={index === 0} onClick={() => moveService(index, -1)}>
                        ‹
                      </Button>
                      <Button
                        variant="secondary"
                        size="compact"
                        type="button"
                        disabled={index === values.services.length - 1}
                        onClick={() => moveService(index, 1)}
                      >
                        ›
                      </Button>
                      {values.services.length > 1 && (
                        <Button variant="secondary" size="compact" type="button" onClick={() => removeService(index)}>
                          מחיקה
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className={`${styles.field} ${errors[`service-title-${index}`] ? styles.fieldInvalid : ""}`}>
                    <label htmlFor={`service-title-${index}`}>שם השירות *</label>
                    <input
                      id={`service-title-${index}`}
                      type="text"
                      value={service.title}
                      onChange={(e) => updateService(index, { title: e.target.value })}
                      aria-invalid={Boolean(errors[`service-title-${index}`])}
                      aria-describedby={errors[`service-title-${index}`] ? `service-title-${index}-error` : undefined}
                    />
                    {errors[`service-title-${index}`] && (
                      <p id={`service-title-${index}-error`} className={styles.fieldErrorMessage} role="alert">
                        {`שירות ${index + 1} — ${errors[`service-title-${index}`]}`}
                      </p>
                    )}
                  </div>
                  <div className={`${styles.field} ${errors[`service-desc-${index}`] ? styles.fieldInvalid : ""}`}>
                    <label htmlFor={`service-desc-${index}`}>תיאור קצר</label>
                    <input
                      id={`service-desc-${index}`}
                      type="text"
                      value={service.description}
                      onChange={(e) => updateService(index, { description: e.target.value })}
                      aria-invalid={Boolean(errors[`service-desc-${index}`])}
                      aria-describedby={errors[`service-desc-${index}`] ? `service-desc-${index}-error` : undefined}
                    />
                    {errors[`service-desc-${index}`] && (
                      <p id={`service-desc-${index}-error`} className={styles.fieldErrorMessage} role="alert">
                        {`שירות ${index + 1} — ${errors[`service-desc-${index}`]}`}
                      </p>
                    )}
                  </div>
                  <div className={`${styles.field} ${errors[`service-price-${index}`] ? styles.fieldInvalid : ""}`}>
                    <label htmlFor={`service-price-${index}`}>מחיר או טווח מחיר</label>
                    <input
                      id={`service-price-${index}`}
                      type="text"
                      placeholder="החל מ־150 ₪ / לפי הצעת מחיר"
                      value={service.priceLabel}
                      onChange={(e) => updateService(index, { priceLabel: e.target.value })}
                      aria-invalid={Boolean(errors[`service-price-${index}`])}
                      aria-describedby={errors[`service-price-${index}`] ? `service-price-${index}-error` : undefined}
                    />
                    {errors[`service-price-${index}`] && (
                      <p id={`service-price-${index}-error`} className={styles.fieldErrorMessage} role="alert">
                        {`שירות ${index + 1} — ${errors[`service-price-${index}`]}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {values.services.length < 12 && (
              <Button variant="secondary" type="button" onClick={addService}>
                הוספת שירות נוסף
              </Button>
            )}

            <h3 className={styles.subStepTitle}>המלצות מלקוחות (אופציונלי)</h3>
            <p className={styles.hintText}>הוסיפו ציטוטים קצרים מלקוחות מרוצים — הם יוצגו בקרוסלה בעמוד העסק.</p>
            {errors.testimonials && (
              <p className={styles.fieldErrorMessage} role="alert">
                {errors.testimonials}
              </p>
            )}
            {values.testimonials.map((testimonial, index) => {
              const hasCardError = Boolean(
                errors[`testimonial-author-${index}`] || errors[`testimonial-text-${index}`] || errors[`testimonial-role-${index}`],
              );
              return (
                <div key={index} className={`${styles.serviceCard} ${hasCardError ? styles.invalid : ""}`}>
                  <div className={styles.serviceCardHeader}>
                    <span className={styles.hintText}>המלצה {index + 1}</span>
                    <div className={styles.imageMoveButtons}>
                      <Button variant="secondary" size="compact" type="button" disabled={index === 0} onClick={() => moveTestimonial(index, -1)}>
                        ‹
                      </Button>
                      <Button
                        variant="secondary"
                        size="compact"
                        type="button"
                        disabled={index === values.testimonials.length - 1}
                        onClick={() => moveTestimonial(index, 1)}
                      >
                        ›
                      </Button>
                      <Button variant="secondary" size="compact" type="button" onClick={() => removeTestimonial(index)}>
                        מחיקה
                      </Button>
                    </div>
                  </div>
                  <div className={`${styles.field} ${errors[`testimonial-author-${index}`] ? styles.fieldInvalid : ""}`}>
                    <label htmlFor={`testimonial-author-${index}`}>שם הממליץ/ה *</label>
                    <input
                      id={`testimonial-author-${index}`}
                      type="text"
                      value={testimonial.authorName}
                      onChange={(e) => updateTestimonial(index, { authorName: e.target.value })}
                      aria-invalid={Boolean(errors[`testimonial-author-${index}`])}
                      aria-describedby={errors[`testimonial-author-${index}`] ? `testimonial-author-${index}-error` : undefined}
                    />
                    {errors[`testimonial-author-${index}`] && (
                      <p id={`testimonial-author-${index}-error`} className={styles.fieldErrorMessage} role="alert">
                        {`המלצה ${index + 1} — ${errors[`testimonial-author-${index}`]}`}
                      </p>
                    )}
                  </div>
                  <div className={`${styles.field} ${errors[`testimonial-role-${index}`] ? styles.fieldInvalid : ""}`}>
                    <label htmlFor={`testimonial-role-${index}`}>תפקיד או הקשר (אופציונלי)</label>
                    <input
                      id={`testimonial-role-${index}`}
                      type="text"
                      placeholder="לקוחה קבועה / בעל עסק שכן"
                      value={testimonial.roleOrContext}
                      onChange={(e) => updateTestimonial(index, { roleOrContext: e.target.value })}
                      aria-invalid={Boolean(errors[`testimonial-role-${index}`])}
                      aria-describedby={errors[`testimonial-role-${index}`] ? `testimonial-role-${index}-error` : undefined}
                    />
                    {errors[`testimonial-role-${index}`] && (
                      <p id={`testimonial-role-${index}-error`} className={styles.fieldErrorMessage} role="alert">
                        {`המלצה ${index + 1} — ${errors[`testimonial-role-${index}`]}`}
                      </p>
                    )}
                  </div>
                  <div className={`${styles.field} ${errors[`testimonial-text-${index}`] ? styles.fieldInvalid : ""}`}>
                    <label htmlFor={`testimonial-text-${index}`}>תוכן ההמלצה *</label>
                    <textarea
                      id={`testimonial-text-${index}`}
                      rows={3}
                      maxLength={500}
                      value={testimonial.text}
                      onChange={(e) => updateTestimonial(index, { text: e.target.value })}
                      aria-invalid={Boolean(errors[`testimonial-text-${index}`])}
                      aria-describedby={errors[`testimonial-text-${index}`] ? `testimonial-text-${index}-error` : undefined}
                    />
                    {errors[`testimonial-text-${index}`] && (
                      <p id={`testimonial-text-${index}-error`} className={styles.fieldErrorMessage} role="alert">
                        {`המלצה ${index + 1} — ${errors[`testimonial-text-${index}`]}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {values.testimonials.length < 10 && (
              <Button variant="secondary" type="button" onClick={addTestimonial}>
                הוספת המלצה
              </Button>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 id="wizard-step-heading" tabIndex={-1} className={styles.stepTitle}>
              מתי ואיך אפשר ליצור איתכם קשר?
            </h2>

            <div className={styles.field}>
              <label>שעות פעילות</label>
              {WEEKDAYS.map((day) => {
                const dayValue = values.openingHours[day];
                const dayError = errors[`hours_${day}`];
                return (
                  <div key={day} id={`hours-${day}`} tabIndex={-1} className={`${styles.hoursRow} ${dayError ? styles.invalid : ""}`}>
                    <span className={styles.hoursDay}>{WEEKDAY_LABEL[day]}</span>
                    <label className={styles.checkboxRow}>
                      <input type="checkbox" checked={!dayValue.closed} onChange={(e) => updateDayHours(day, { closed: !e.target.checked })} />
                      פתוח
                    </label>
                    {!dayValue.closed && (
                      <div className={styles.hoursIntervals}>
                        {dayValue.intervals.map((interval, intervalIndex) => (
                          <span key={intervalIndex}>
                            <input
                              type="time"
                              aria-label={`שעת פתיחה ${WEEKDAY_LABEL[day]}`}
                              aria-invalid={Boolean(dayError)}
                              value={interval.opensAt}
                              onChange={(e) => {
                                const intervals = dayValue.intervals.map((iv, i) => (i === intervalIndex ? { ...iv, opensAt: e.target.value } : iv));
                                updateDayHours(day, { intervals });
                              }}
                            />
                            {" – "}
                            <input
                              type="time"
                              aria-label={`שעת סגירה ${WEEKDAY_LABEL[day]}`}
                              aria-invalid={Boolean(dayError)}
                              value={interval.closesAt}
                              onChange={(e) => {
                                const intervals = dayValue.intervals.map((iv, i) => (i === intervalIndex ? { ...iv, closesAt: e.target.value } : iv));
                                updateDayHours(day, { intervals });
                              }}
                            />
                          </span>
                        ))}
                        <Button variant="secondary" size="compact" type="button" onClick={() => copyHoursToAllDays(day)}>
                          העתקת השעות לכל ימי השבוע
                        </Button>
                      </div>
                    )}
                    {dayError && (
                      <p className={`${styles.fieldErrorMessage} ${styles.hoursRowError}`} role="alert">
                        {dayError}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={styles.row}>
              <div className={`${styles.field} ${errors.publicPhone ? styles.fieldInvalid : ""}`}>
                <label htmlFor="publicPhone">טלפון ציבורי</label>
                <input
                  id="publicPhone"
                  type="tel"
                  dir="ltr"
                  placeholder={values.contactPhone}
                  value={values.publicPhone}
                  onChange={(e) => update("publicPhone", e.target.value)}
                  aria-invalid={Boolean(errors.publicPhone)}
                  aria-describedby={errors.publicPhone ? "publicPhone-error" : undefined}
                />
                {errors.publicPhone && (
                  <p id="publicPhone-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.publicPhone}
                  </p>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={values.whatsappSameAsPublicPhone}
                    onChange={(e) => update("whatsappSameAsPublicPhone", e.target.checked)}
                  />
                  מספר ה-WhatsApp זהה לטלפון הציבורי
                </label>
                {!values.whatsappSameAsPublicPhone && (
                  <input
                    id="publicWhatsapp"
                    type="tel"
                    dir="ltr"
                    aria-label="WhatsApp ציבורי"
                    aria-invalid={Boolean(errors.publicWhatsapp)}
                    aria-describedby={errors.publicWhatsapp ? "publicWhatsapp-error" : undefined}
                    value={values.publicWhatsapp}
                    onChange={(e) => update("publicWhatsapp", e.target.value)}
                  />
                )}
                {errors.publicWhatsapp && (
                  <p id="publicWhatsapp-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.publicWhatsapp}
                  </p>
                )}
              </div>
            </div>

            <div className={`${styles.field} ${errors.publicEmail ? styles.fieldInvalid : ""}`}>
              <label htmlFor="publicEmail">אימייל עסקי (אופציונלי להצגה באתר)</label>
              <input
                id="publicEmail"
                type="email"
                dir="ltr"
                value={values.publicEmail}
                onChange={(e) => update("publicEmail", e.target.value)}
                aria-invalid={Boolean(errors.publicEmail)}
                aria-describedby={errors.publicEmail ? "publicEmail-error" : undefined}
              />
              {errors.publicEmail && (
                <p id="publicEmail-error" className={styles.fieldErrorMessage} role="alert">
                  {errors.publicEmail}
                </p>
              )}
            </div>

            <div className={styles.row}>
              <div className={`${styles.field} ${errors.websiteUrl ? styles.fieldInvalid : ""}`}>
                <label htmlFor="websiteUrl">אתר</label>
                <input
                  id="websiteUrl"
                  type="url"
                  dir="ltr"
                  placeholder="https://..."
                  value={values.websiteUrl}
                  onChange={(e) => update("websiteUrl", e.target.value)}
                  aria-invalid={Boolean(errors.websiteUrl)}
                  aria-describedby={errors.websiteUrl ? "websiteUrl-error" : undefined}
                />
                {errors.websiteUrl && (
                  <p id="websiteUrl-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.websiteUrl}
                  </p>
                )}
              </div>
              <div className={`${styles.field} ${errors.instagramUrl ? styles.fieldInvalid : ""}`}>
                <label htmlFor="instagramUrl">Instagram</label>
                <input
                  id="instagramUrl"
                  type="url"
                  dir="ltr"
                  placeholder="https://instagram.com/..."
                  value={values.instagramUrl}
                  onChange={(e) => update("instagramUrl", e.target.value)}
                  aria-invalid={Boolean(errors.instagramUrl)}
                  aria-describedby={errors.instagramUrl ? "instagramUrl-error" : undefined}
                />
                {errors.instagramUrl && (
                  <p id="instagramUrl-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.instagramUrl}
                  </p>
                )}
              </div>
            </div>
            <div className={styles.row}>
              <div className={`${styles.field} ${errors.facebookUrl ? styles.fieldInvalid : ""}`}>
                <label htmlFor="facebookUrl">Facebook</label>
                <input
                  id="facebookUrl"
                  type="url"
                  dir="ltr"
                  placeholder="https://facebook.com/..."
                  value={values.facebookUrl}
                  onChange={(e) => update("facebookUrl", e.target.value)}
                  aria-invalid={Boolean(errors.facebookUrl)}
                  aria-describedby={errors.facebookUrl ? "facebookUrl-error" : undefined}
                />
                {errors.facebookUrl && (
                  <p id="facebookUrl-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.facebookUrl}
                  </p>
                )}
              </div>
              <div className={`${styles.field} ${errors.tiktokUrl ? styles.fieldInvalid : ""}`}>
                <label htmlFor="tiktokUrl">TikTok</label>
                <input
                  id="tiktokUrl"
                  type="url"
                  dir="ltr"
                  placeholder="https://tiktok.com/..."
                  value={values.tiktokUrl}
                  onChange={(e) => update("tiktokUrl", e.target.value)}
                  aria-invalid={Boolean(errors.tiktokUrl)}
                  aria-describedby={errors.tiktokUrl ? "tiktokUrl-error" : undefined}
                />
                {errors.tiktokUrl && (
                  <p id="tiktokUrl-error" className={styles.fieldErrorMessage} role="alert">
                    {errors.tiktokUrl}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={values.promotionEnabled} onChange={(e) => update("promotionEnabled", e.target.checked)} />
                הצגת מבצע או הודעה מיוחדת
              </label>
              {values.promotionEnabled && (
                <>
                  <input
                    type="text"
                    placeholder="לדוגמה: 10% הנחה לתושבי נווה שמיר"
                    value={values.promotionTitle}
                    onChange={(e) => update("promotionTitle", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="תיאור (אופציונלי)"
                    value={values.promotionDescription}
                    onChange={(e) => update("promotionDescription", e.target.value)}
                  />
                  <input type="date" aria-label="תאריך סיום המבצע" value={values.promotionValidUntil} onChange={(e) => update("promotionValidUntil", e.target.value)} />
                </>
              )}
            </div>
          </>
        )}

        {step === 5 && (
          <ReviewStep
            values={values}
            planId={planId}
            priceLabel={priceLabel}
            errors={errors}
            onEdit={goToStep}
            onChangeConsent={update}
          />
        )}

        <div className={styles.stepActions}>
          {step > 1 ? (
            <Button variant="secondary" type="button" onClick={goBack}>
              חזרה
            </Button>
          ) : (
            <span />
          )}
          {step < 5 ? (
            <Button variant="primary" type="button" onClick={goNext}>
              המשך
            </Button>
          ) : (
            <Button variant="accent" type="button" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "בודקים…" : "שליחת העסק לבדיקה"}
            </Button>
          )}
        </div>
      </div>

      {/* Honeypot — hidden from real visitors via CSS, never via type="hidden" (some bots skip those). */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">אתר</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" value={values.honeypot} onChange={(e) => update("honeypot", e.target.value)} />
      </div>
    </div>
  );
}

type ReviewStepProps = {
  values: WizardValues;
  planId: "plus" | "premium";
  priceLabel: string;
  errors: WizardErrors;
  onEdit: (step: number) => void;
  onChangeConsent: <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => void;
};

function ReviewStep({ values, planId, priceLabel, errors, onEdit, onChangeConsent }: ReviewStepProps) {
  const categoryLabels = useMemo(
    () => CATEGORIES.filter((c) => values.categoryIds.includes(c.id)).map((c) => c.label).join(", "),
    [values.categoryIds],
  );
  const realServices = values.services.filter((s) => s.title.trim());
  const realTestimonials = values.testimonials.filter((t) => t.authorName.trim() && t.text.trim());

  return (
    <>
      <h2 id="wizard-step-heading" tabIndex={-1} className={styles.stepTitle}>
        כמעט סיימנו
      </h2>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionHeader}>
          <h3 className={styles.reviewSectionTitle}>פרטי העסק</h3>
          <Button variant="secondary" size="compact" type="button" onClick={() => onEdit(1)}>
            עריכה
          </Button>
        </div>
        <div className={styles.reviewGrid}>
          <div>
            <p className={styles.reviewLabel}>שם העסק</p>
            <p className={styles.reviewValue}>{values.businessName}</p>
          </div>
          <div>
            <p className={styles.reviewLabel}>קטגוריה</p>
            <p className={styles.reviewValue}>{categoryLabels || "—"}</p>
          </div>
        </div>
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionHeader}>
          <h3 className={styles.reviewSectionTitle}>תמונות ותיאור</h3>
          <Button variant="secondary" size="compact" type="button" onClick={() => onEdit(2)}>
            עריכה
          </Button>
        </div>
        {values.coverImage && (
          <div className={styles.imagePreview}>
            <img src={values.coverImage.url} alt={values.coverImage.alt} />
          </div>
        )}
        <p className={styles.reviewValue}>{values.shortDescription}</p>
        <p className={styles.reviewValue}>{values.fullDescription}</p>
        <p className={styles.reviewLabel}>{values.gallery.length} תמונות בגלריה</p>
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionHeader}>
          <h3 className={styles.reviewSectionTitle}>שירותים</h3>
          <Button variant="secondary" size="compact" type="button" onClick={() => onEdit(3)}>
            עריכה
          </Button>
        </div>
        {realServices.map((s) => (
          <p key={s.title} className={styles.reviewValue}>
            {s.title}
            {s.priceLabel ? ` — ${s.priceLabel}` : ""}
          </p>
        ))}
        {realTestimonials.length > 0 && (
          <>
            <p className={styles.reviewLabel}>המלצות ({realTestimonials.length})</p>
            {realTestimonials.map((t) => (
              <p key={t.authorName} className={styles.reviewValue}>
                {`"${t.text}" — ${t.authorName}`}
              </p>
            ))}
          </>
        )}
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionHeader}>
          <h3 className={styles.reviewSectionTitle}>שעות ופרטי קשר</h3>
          <Button variant="secondary" size="compact" type="button" onClick={() => onEdit(4)}>
            עריכה
          </Button>
        </div>
        <p className={styles.reviewValue} dir="ltr">
          {values.publicPhone || values.contactPhone}
        </p>
        {values.promotionEnabled && values.promotionTitle && <p className={styles.reviewValue}>מבצע: {values.promotionTitle}</p>}
      </div>

      <div className={styles.reviewSection}>
        <p className={styles.reviewLabel}>מסלול {planId === "plus" ? "Plus" : "Premium"}</p>
        {planId === "plus" ? (
          <>
            <p className={styles.reviewValue}>חודש ראשון חינם</p>
            <p className={styles.reviewValue}>לאחר תקופת הניסיון: {priceLabel} לחודש</p>
          </>
        ) : (
          <p className={styles.reviewValue}>{priceLabel} לחודש</p>
        )}
      </div>

      {planId === "premium" && (
        <div className={styles.reviewSection}>
          <p className={styles.reviewLabel}>לאחר אישור והפעלה תקבלו גישה אישית ומאובטחת</p>
          <p className={styles.reviewValue}>
            לאחר אישור העסק והפעלת חבילת Premium, יישלח אליכם למייל קישור אישי ומאובטח לאזור האישי — שם תוכלו לעדכן
            בעצמכם שם עסק, תיאור קצר ומלא, תמונות, שירותים, שעות פעילות, פרטי קשר, קישורים ומבצעים.
          </p>
        </div>
      )}

      <div className={`${styles.field} ${errors.publicationConsent ? styles.fieldInvalid : ""}`}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={values.publicationConsent}
            onChange={(e) => onChangeConsent("publicationConsent", e.target.checked)}
            aria-invalid={Boolean(errors.publicationConsent)}
            aria-describedby={errors.publicationConsent ? "publicationConsent-error" : undefined}
          />
          אני מאשר/ת שהפרטים שמסרתי נכונים ושניתן לפרסם אותם בפורטל לאחר אישור.
        </label>
        {errors.publicationConsent && (
          <p id="publicationConsent-error" className={styles.fieldErrorMessage} role="alert">
            {errors.publicationConsent}
          </p>
        )}
      </div>
      <div className={`${styles.field} ${errors.termsAccepted ? styles.fieldInvalid : ""}`}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={values.termsAccepted}
            onChange={(e) => onChangeConsent("termsAccepted", e.target.checked)}
            aria-invalid={Boolean(errors.termsAccepted)}
            aria-describedby={errors.termsAccepted ? "termsAccepted-error" : undefined}
          />
          קראתי ואישרתי את תנאי השימוש ומדיניות הפרטיות.
        </label>
        {errors.termsAccepted && (
          <p id="termsAccepted-error" className={styles.fieldErrorMessage} role="alert">
            {errors.termsAccepted}
          </p>
        )}
      </div>
      {planId === "plus" ? (
        <div className={`${styles.field} ${errors.trialConsent ? styles.fieldInvalid : ""}`}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={values.trialConsent}
              onChange={(e) => onChangeConsent("trialConsent", e.target.checked)}
              aria-invalid={Boolean(errors.trialConsent)}
              aria-describedby={errors.trialConsent ? "trialConsent-error" : undefined}
            />
            אני מאשר/ת להפעיל את חודש הניסיון לאחר אישור העסק.
          </label>
          {errors.trialConsent && (
            <p id="trialConsent-error" className={styles.fieldErrorMessage} role="alert">
              {errors.trialConsent}
            </p>
          )}
        </div>
      ) : (
        <div className={`${styles.field} ${errors.dashboardAccessConsent ? styles.fieldInvalid : ""}`}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={values.dashboardAccessConsent}
              onChange={(e) => onChangeConsent("dashboardAccessConsent", e.target.checked)}
              aria-invalid={Boolean(errors.dashboardAccessConsent)}
              aria-describedby={errors.dashboardAccessConsent ? "dashboardAccessConsent-error" : undefined}
            />
            אני מאשר/ת להשתמש בכתובת המייל שלי לצורך שליחת גישה מאובטחת לאזור האישי.
          </label>
          {errors.dashboardAccessConsent && (
            <p id="dashboardAccessConsent-error" className={styles.fieldErrorMessage} role="alert">
              {errors.dashboardAccessConsent}
            </p>
          )}
        </div>
      )}
    </>
  );
}

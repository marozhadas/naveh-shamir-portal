"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getVisibleBusinessCategories } from "@/data/business-categories";
import { uploadBusinessMediaAction, submitPlusRegistrationAction, submitPremiumRegistrationAction } from "./actions";
import { BUSINESS_TYPE_OPTIONS, WEEKDAYS, WEEKDAY_LABEL } from "./schema";
import type { PlusBusinessRegistrationInput } from "@/types/business-plus-registration";
import styles from "./plus-wizard.module.css";

const CATEGORIES = getVisibleBusinessCategories();
const DRAFT_KEY_BY_PLAN = {
  plus: "naveh-shamir-plus-registration-draft-v1",
  premium: "naveh-shamir-premium-registration-draft-v1",
} as const;
const PHONE_PATTERN = /^\+?[0-9-\s]{6,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_LABELS = ["פרטי העסק", "תמונות ותיאור", "שירותים", "שעות ופרטי קשר", "בדיקה ושליחה"];

type GalleryImage = { url: string; alt: string };
type ServiceDraft = { title: string; description: string; priceLabel: string };
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
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  function update<K extends keyof WizardValues>(key: K, value: WizardValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // Nothing to do if storage is unavailable.
    }
  }

  // ---- Step 1 validation ----
  function validateStep1(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!values.businessName.trim()) next.businessName = "יש להזין שם עסק";
    if (values.categoryIds.length === 0) next.categoryIds = "יש לבחור לפחות קטגוריה אחת";
    if (!values.businessType) next.businessType = "יש לבחור סוג עסק";
    if (!values.contactName.trim()) next.contactName = "יש להזין שם איש/אשת קשר";
    if (!PHONE_PATTERN.test(values.contactPhone.trim())) next.contactPhone = "מספר הטלפון אינו תקין";
    if (!EMAIL_PATTERN.test(values.contactEmail.trim())) next.contactEmail = "כתובת המייל אינה תקינה";
    if (values.addressType !== "service-area" && !values.address.trim()) next.address = "יש להזין כתובת";
    if (values.addressType !== "physical" && !values.serviceArea.trim()) next.serviceArea = "יש להזין אזור שירות";
    return next;
  }

  // ---- Step 2 validation ----
  function validateStep2(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!values.coverImage) next.coverImage = "יש להעלות תמונה ראשית";
    if (!values.shortDescription.trim()) next.shortDescription = "יש להזין תיאור קצר";
    else if (values.shortDescription.length > 180) next.shortDescription = "התיאור הקצר ארוך מדי — עד 180 תווים";
    if (values.fullDescription.trim().length < 100) next.fullDescription = "התיאור המלא קצר מדי — לפחות 100 תווים";
    return next;
  }

  // ---- Step 3 validation ----
  function validateStep3(): Record<string, string> {
    const next: Record<string, string> = {};
    const realServices = values.services.filter((s) => s.title.trim());
    if (realServices.length === 0) next.services = "יש להוסיף לפחות שירות אחד";
    return next;
  }

  // ---- Step 4 validation ----
  function validateStep4(): Record<string, string> {
    const next: Record<string, string> = {};
    // publicPhone defaults from contactPhone (step 1) when left empty — only flag it if neither is a valid phone.
    const effectivePhone = values.publicPhone.trim() || values.contactPhone.trim();
    if (!PHONE_PATTERN.test(effectivePhone)) next.publicPhone = "מספר הטלפון הציבורי אינו תקין";
    if (!values.whatsappSameAsPublicPhone && values.publicWhatsapp && !PHONE_PATTERN.test(values.publicWhatsapp.trim()))
      next.publicWhatsapp = "מספר הוואטסאפ אינו תקין";
    if (values.publicEmail && !EMAIL_PATTERN.test(values.publicEmail.trim())) next.publicEmail = "כתובת המייל אינה תקינה";
    return next;
  }

  function validateStep5(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!values.publicationConsent) next.publicationConsent = "יש לאשר את פרסום הפרטים";
    if (!values.termsAccepted) next.termsAccepted = "יש לאשר את תנאי השימוש";
    if (planId === "premium") {
      if (!values.dashboardAccessConsent) next.dashboardAccessConsent = "יש לאשר קבלת גישה מאובטחת לאזור האישי במייל";
    } else if (!values.trialConsent) {
      next.trialConsent = "יש לאשר את הפעלת חודש הניסיון";
    }
    return next;
  }

  function validateCurrentStep(): boolean {
    const validators = [validateStep1, validateStep2, validateStep3, validateStep4, validateStep5];
    const next = validators[step - 1]();
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(5, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep(target: number) {
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    update("coverImage", { url: result.url, alt: values.businessName || "תמונת העסק" });
  }

  async function handleGalleryUpload(files: FileList) {
    if (values.gallery.length >= 7) return;
    setUploadingGallery(true);
    const remaining = 7 - values.gallery.length;
    const toUpload = Array.from(files).slice(0, remaining);
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
    setValues((current) => ({
      ...current,
      services: current.services.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function addService() {
    if (values.services.length >= 12) return;
    setValues((current) => ({ ...current, services: [...current.services, { title: "", description: "", priceLabel: "" }] }));
  }

  function removeService(index: number) {
    setValues((current) => ({ ...current, services: current.services.filter((_, i) => i !== index) }));
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

  function updateDayHours(day: (typeof WEEKDAYS)[number], patch: Partial<DayHours>) {
    setValues((current) => ({ ...current, openingHours: { ...current.openingHours, [day]: { ...current.openingHours[day], ...patch } } }));
  }

  function copyHoursToAllDays(day: (typeof WEEKDAYS)[number]) {
    setValues((current) => {
      const source = current.openingHours[day];
      const next = { ...current.openingHours };
      for (const d of WEEKDAYS) next[d] = { closed: source.closed, intervals: source.intervals.map((i) => ({ ...i })) };
      return { ...current, openingHours: next };
    });
  }

  const effectivePublicPhone = values.publicPhone || values.contactPhone;
  const effectivePublicWhatsapp = values.whatsappSameAsPublicPhone ? effectivePublicPhone : values.publicWhatsapp;

  async function handleSubmit() {
    if (!validateCurrentStep()) return;
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
      openingHours: WEEKDAYS.map((day) => ({ day, closed: values.openingHours[day].closed, intervals: values.openingHours[day].intervals })),
      websiteUrl: values.websiteUrl.trim(),
      socialLinks: {
        instagramUrl: values.instagramUrl.trim() || undefined,
        facebookUrl: values.facebookUrl.trim() || undefined,
        tiktokUrl: values.tiktokUrl.trim() || undefined,
      },
      promotion: values.promotionEnabled && values.promotionTitle.trim()
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
      setErrors((e) => ({ ...e, ...Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v[0]])) }));
      setSubmitError(result.message ?? null);
      return;
    }
    setSubmitError(result.message ?? "אירעה שגיאה. נסו שוב.");
  }

  const shortDescCount = `${values.shortDescription.length}/180`;
  const fullDescCount = `${values.fullDescription.length} תווים (מינימום 100)`;

  return (
    <div>
      {draftRestored && step === 1 && <p className={styles.draftNotice}>שחזרנו את הפרטים שמילאתם</p>}

      <ol className={styles.progress}>
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          return (
            <li key={label} className={`${styles.progressStep} ${stepNumber === step ? styles.active : ""} ${stepNumber < step ? styles.done : ""}`}>
              <div className={styles.progressBar} />
              <span className={styles.progressLabel}>
                {stepNumber}. {label}
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

      {Object.keys(errors).length > 0 && (
        <div className={styles.summary} role="alert" aria-live="assertive">
          <p className={styles.summaryTitle}>יש כמה פרטים שצריך לתקן</p>
          <p className={styles.summaryDescription}>כל מה שמילאתם נשמר. עברו על השדות המסומנים והשלימו את החסר.</p>
        </div>
      )}

      <div className={styles.stepCard}>
        {step === 1 && (
          <>
            <h2 className={styles.stepTitle}>ספרו לנו על העסק</h2>

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
              <label id="category-label">קטגוריה *</label>
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
                <p className={styles.fieldErrorMessage} role="alert">
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
                <p className={styles.fieldErrorMessage} role="alert">
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
              />
              <p className={styles.hintText}>המידע מיועד לניהול ההרשמה ולא בהכרח יוצג באתר.</p>
              {errors.contactName && (
                <p className={styles.fieldErrorMessage} role="alert">
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
                />
                {errors.contactPhone && (
                  <p className={styles.fieldErrorMessage} role="alert">
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
                />
                <p className={styles.hintText}>ישמש לעדכונים בנוגע להרשמה ולמנוי.</p>
                {errors.contactEmail && (
                  <p className={styles.fieldErrorMessage} role="alert">
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
                <input id="address" type="text" value={values.address} onChange={(e) => update("address", e.target.value)} />
                {errors.address && (
                  <p className={styles.fieldErrorMessage} role="alert">
                    {errors.address}
                  </p>
                )}
              </div>
            )}
            {values.addressType !== "physical" && (
              <div className={`${styles.field} ${errors.serviceArea ? styles.fieldInvalid : ""}`}>
                <label htmlFor="serviceArea">אזור שירות</label>
                <input id="serviceArea" type="text" value={values.serviceArea} onChange={(e) => update("serviceArea", e.target.value)} />
                {errors.serviceArea && (
                  <p className={styles.fieldErrorMessage} role="alert">
                    {errors.serviceArea}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className={styles.stepTitle}>בואו נראה ללקוחות מה מיוחד בעסק</h2>

            <div className={`${styles.imageUpload} ${errors.coverImage ? styles.fieldInvalid : ""}`}>
              <label>תמונה ראשית *</label>
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
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="העלאת תמונה ראשית"
                  disabled={uploadingCover}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverUpload(file);
                  }}
                />
              )}
              {uploadingCover && <p className={styles.hintText}>מעלה תמונה…</p>}
              {errors.coverImage && (
                <p className={styles.fieldErrorMessage} role="alert">
                  {errors.coverImage}
                </p>
              )}
            </div>

            <div className={styles.imageUpload}>
              <label>גלריית תמונות (עד 8 תמונות כולל התמונה הראשית)</label>
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
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  aria-label="הוספת תמונות לגלריה"
                  disabled={uploadingGallery}
                  onChange={(e) => {
                    if (e.target.files?.length) void handleGalleryUpload(e.target.files);
                  }}
                />
              )}
              {uploadingGallery && <p className={styles.hintText}>מעלה תמונות…</p>}
              {errors.gallery && (
                <p className={styles.fieldErrorMessage} role="alert">
                  {errors.gallery}
                </p>
              )}
            </div>

            <div className={`${styles.field} ${errors.shortDescription ? styles.fieldInvalid : ""}`}>
              <label htmlFor="shortDescription">תיאור קצר *</label>
              <p className={styles.hintText}>יופיע בכרטיס העסק באינדקס.</p>
              <input
                id="shortDescription"
                type="text"
                maxLength={180}
                value={values.shortDescription}
                onChange={(e) => update("shortDescription", e.target.value)}
                aria-invalid={Boolean(errors.shortDescription)}
              />
              <span className={styles.charCount}>{shortDescCount}</span>
              {errors.shortDescription && (
                <p className={styles.fieldErrorMessage} role="alert">
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
              />
              <span className={styles.charCount}>{fullDescCount}</span>
              {errors.fullDescription && (
                <p className={styles.fieldErrorMessage} role="alert">
                  {errors.fullDescription}
                </p>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className={styles.stepTitle}>אילו שירותים או מוצרים אתם מציעים?</h2>
            {errors.services && (
              <p className={styles.fieldErrorMessage} role="alert">
                {errors.services}
              </p>
            )}
            {values.services.map((service, index) => (
              <div key={index} className={styles.serviceCard}>
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
                <div className={styles.field}>
                  <label htmlFor={`service-title-${index}`}>שם השירות *</label>
                  <input
                    id={`service-title-${index}`}
                    type="text"
                    value={service.title}
                    onChange={(e) => updateService(index, { title: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`service-desc-${index}`}>תיאור קצר</label>
                  <input
                    id={`service-desc-${index}`}
                    type="text"
                    value={service.description}
                    onChange={(e) => updateService(index, { description: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`service-price-${index}`}>מחיר או טווח מחיר</label>
                  <input
                    id={`service-price-${index}`}
                    type="text"
                    placeholder="החל מ־150 ₪ / לפי הצעת מחיר"
                    value={service.priceLabel}
                    onChange={(e) => updateService(index, { priceLabel: e.target.value })}
                  />
                </div>
              </div>
            ))}
            {values.services.length < 12 && (
              <Button variant="secondary" type="button" onClick={addService}>
                הוספת שירות נוסף
              </Button>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 className={styles.stepTitle}>מתי ואיך אפשר ליצור איתכם קשר?</h2>

            <div className={styles.field}>
              <label>שעות פעילות</label>
              {WEEKDAYS.map((day) => {
                const dayValue = values.openingHours[day];
                return (
                  <div key={day} className={styles.hoursRow}>
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
                              value={interval.closesAt}
                              onChange={(e) => {
                                const intervals = dayValue.intervals.map((iv, i) => (i === intervalIndex ? { ...iv, closesAt: e.target.value } : iv));
                                updateDayHours(day, { intervals });
                              }}
                            />
                          </span>
                        ))}
                        <Button
                          variant="secondary"
                          size="compact"
                          type="button"
                          onClick={() => copyHoursToAllDays(day)}
                        >
                          העתקת השעות לכל ימי השבוע
                        </Button>
                      </div>
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
                />
                {errors.publicPhone && (
                  <p className={styles.fieldErrorMessage} role="alert">
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
                    type="tel"
                    dir="ltr"
                    aria-label="WhatsApp ציבורי"
                    value={values.publicWhatsapp}
                    onChange={(e) => update("publicWhatsapp", e.target.value)}
                  />
                )}
                {errors.publicWhatsapp && (
                  <p className={styles.fieldErrorMessage} role="alert">
                    {errors.publicWhatsapp}
                  </p>
                )}
              </div>
            </div>

            <div className={`${styles.field} ${errors.publicEmail ? styles.fieldInvalid : ""}`}>
              <label htmlFor="publicEmail">אימייל עסקי (אופציונלי להצגה באתר)</label>
              <input id="publicEmail" type="email" dir="ltr" value={values.publicEmail} onChange={(e) => update("publicEmail", e.target.value)} />
              {errors.publicEmail && (
                <p className={styles.fieldErrorMessage} role="alert">
                  {errors.publicEmail}
                </p>
              )}
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="websiteUrl">אתר</label>
                <input id="websiteUrl" type="url" dir="ltr" placeholder="https://..." value={values.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="instagramUrl">Instagram</label>
                <input id="instagramUrl" type="url" dir="ltr" placeholder="https://instagram.com/..." value={values.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="facebookUrl">Facebook</label>
                <input id="facebookUrl" type="url" dir="ltr" placeholder="https://facebook.com/..." value={values.facebookUrl} onChange={(e) => update("facebookUrl", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="tiktokUrl">TikTok</label>
                <input id="tiktokUrl" type="url" dir="ltr" placeholder="https://tiktok.com/..." value={values.tiktokUrl} onChange={(e) => update("tiktokUrl", e.target.value)} />
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
              {submitting ? "שולחים את העסק…" : "שליחת העסק לבדיקה"}
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
  errors: Record<string, string>;
  onEdit: (step: number) => void;
  onChangeConsent: <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => void;
};

function ReviewStep({ values, planId, priceLabel, errors, onEdit, onChangeConsent }: ReviewStepProps) {
  const categoryLabels = useMemo(
    () => CATEGORIES.filter((c) => values.categoryIds.includes(c.id)).map((c) => c.label).join(", "),
    [values.categoryIds],
  );
  const realServices = values.services.filter((s) => s.title.trim());

  return (
    <>
      <h2 className={styles.stepTitle}>כמעט סיימנו</h2>

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
          <input type="checkbox" checked={values.publicationConsent} onChange={(e) => onChangeConsent("publicationConsent", e.target.checked)} />
          אני מאשר/ת שהפרטים שמסרתי נכונים ושניתן לפרסם אותם בפורטל לאחר אישור.
        </label>
        {errors.publicationConsent && (
          <p className={styles.fieldErrorMessage} role="alert">
            {errors.publicationConsent}
          </p>
        )}
      </div>
      <div className={`${styles.field} ${errors.termsAccepted ? styles.fieldInvalid : ""}`}>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={values.termsAccepted} onChange={(e) => onChangeConsent("termsAccepted", e.target.checked)} />
          קראתי ואישרתי את תנאי השימוש ומדיניות הפרטיות.
        </label>
        {errors.termsAccepted && (
          <p className={styles.fieldErrorMessage} role="alert">
            {errors.termsAccepted}
          </p>
        )}
      </div>
      {planId === "plus" ? (
        <div className={`${styles.field} ${errors.trialConsent ? styles.fieldInvalid : ""}`}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={values.trialConsent} onChange={(e) => onChangeConsent("trialConsent", e.target.checked)} />
            אני מאשר/ת להפעיל את חודש הניסיון לאחר אישור העסק.
          </label>
          {errors.trialConsent && (
            <p className={styles.fieldErrorMessage} role="alert">
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
            />
            אני מאשר/ת להשתמש בכתובת המייל שלי לצורך שליחת גישה מאובטחת לאזור האישי.
          </label>
          {errors.dashboardAccessConsent && (
            <p className={styles.fieldErrorMessage} role="alert">
              {errors.dashboardAccessConsent}
            </p>
          )}
        </div>
      )}
    </>
  );
}

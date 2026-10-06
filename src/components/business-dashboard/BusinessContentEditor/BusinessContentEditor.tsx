"use client";

import { useId, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getVisibleBusinessCategories } from "@/data/business-categories";
import { BUSINESS_TYPE_OPTIONS, WEEKDAYS, WEEKDAY_LABEL } from "@/app/business/register/plus/schema";
import type { BusinessManagementEditValues } from "@/app/business/manage/[token]/schema";
import { compressImageForUpload } from "@/utils/compress-image-for-upload";
import styles from "./BusinessContentEditor.module.css";

const CATEGORIES = getVisibleBusinessCategories();
const MAX_GALLERY = 7;
const MAX_SERVICES = 12;
const MAX_TESTIMONIALS = 10;

export type EditorSaveResult =
  | { status: "success"; locked?: boolean; nextEligibleAt?: string }
  | { status: "validation-error"; message: string; fieldErrors: Record<string, string[]> }
  | { status: "invalid-link" | "server-error" | "error"; message: string };

export type EditorUploadResult = { success: true; url: string } | { success: false; message: string };
export type EditorMediaKind = "cover" | "gallery" | "testimonial";

type BusinessContentEditorProps = {
  initialValues: BusinessManagementEditValues;
  /** Persists the whole form. Server-side validation + authorization live in the action itself — the editor trusts nothing it does client-side. */
  saveAction: (values: BusinessManagementEditValues) => Promise<EditorSaveResult>;
  uploadAction: (kind: EditorMediaKind, formData: FormData) => Promise<EditorUploadResult>;
  /** Only the secret-link flow deletes a replaced file right away; the dashboard cleans up server-side after a successful save instead. */
  removeMediaAction?: (url: string) => Promise<void>;
  previewHref: string;
  previewLabel: string;
  /** Shown beside the preview link, e.g. what the preview does and does not include. */
  previewHint?: string;
  /** Overrides the "saved" message, e.g. to say what the Plus lock means. */
  disabledReason?: string;
};

type Values = BusinessManagementEditValues;
type Weekday = (typeof WEEKDAYS)[number];

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function formatJerusalemDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function FieldErrors({ errors }: { errors: string[] | undefined }) {
  return (
    <>
      {(errors ?? []).map((message) => (
        <p key={message} className={styles.fieldError} role="alert">
          {message}
        </p>
      ))}
    </>
  );
}

export function BusinessContentEditor({
  initialValues,
  saveAction,
  uploadAction,
  removeMediaAction,
  previewHref,
  previewLabel,
  previewHint,
  disabledReason,
}: BusinessContentEditorProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [values, setValues] = useState<Values>(initialValues);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [lockedUntil, setLockedUntil] = useState<{ nextEligibleAt?: string } | null>(null);

  const locked = lockedUntil !== null || Boolean(disabledReason);
  const busy = isPending || uploading !== null;

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleCategory(categoryId: string) {
    setValues((v) => {
      const has = v.categoryIds.includes(categoryId);
      return { ...v, categoryIds: has ? v.categoryIds.filter((c) => c !== categoryId) : [...v.categoryIds, categoryId] };
    });
  }

  async function uploadImage(kind: EditorMediaKind, slot: string, file: File): Promise<string | null> {
    setUploadError("");
    setUploading(slot);
    try {
      const prepared = await compressImageForUpload(file);
      const formData = new FormData();
      formData.set("file", prepared);
      const result = await uploadAction(kind, formData);
      if (!result.success) {
        setUploadError(result.message);
        return null;
      }
      return result.url;
    } catch {
      setUploadError("העלאת התמונה נכשלה. בדקו את החיבור ונסו שוב.");
      return null;
    } finally {
      setUploading(null);
    }
  }

  async function handleCoverSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await uploadImage("cover", "cover", file);
    if (!url) return;
    const previousUrl = values.coverImage.url;
    update("coverImage", { url, alt: values.coverImage.alt || values.businessName });
    if (previousUrl && removeMediaAction) void removeMediaAction(previousUrl);
  }

  async function handleGallerySelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (values.gallery.length >= MAX_GALLERY) {
      setUploadError("עד 7 תמונות גלריה נוספות (8 בסך הכול כולל התמונה הראשית).");
      return;
    }
    const url = await uploadImage("gallery", "gallery", file);
    if (!url) return;
    setValues((v) => ({ ...v, gallery: [...v.gallery, { url, alt: v.businessName, order: v.gallery.length }] }));
  }

  function removeGalleryImage(index: number) {
    const image = values.gallery[index];
    update(
      "gallery",
      values.gallery.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i })),
    );
    if (image?.url && removeMediaAction) void removeMediaAction(image.url);
  }

  function moveGalleryImage(index: number, delta: number) {
    update(
      "gallery",
      move(values.gallery, index, index + delta).map((item, i) => ({ ...item, order: i })),
    );
  }

  function updateService(index: number, patch: Partial<Values["services"][number]>) {
    update(
      "services",
      values.services.map((service, i) => (i === index ? { ...service, ...patch } : service)),
    );
  }

  function updateTestimonial(index: number, patch: Partial<Values["testimonials"][number]>) {
    update(
      "testimonials",
      values.testimonials.map((testimonial, i) => (i === index ? { ...testimonial, ...patch } : testimonial)),
    );
  }

  async function handleTestimonialImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await uploadImage("testimonial", `testimonial-${index}`, file);
    if (!url) return;
    const previousUrl = values.testimonials[index]?.imageUrl;
    updateTestimonial(index, { imageUrl: url });
    if (previousUrl && removeMediaAction) void removeMediaAction(previousUrl);
  }

  function updateDay(day: Weekday, patch: Partial<Values["openingHours"][number]>) {
    update(
      "openingHours",
      values.openingHours.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)),
    );
  }

  function addInterval(day: Weekday) {
    const entry = values.openingHours.find((e) => e.day === day);
    if (!entry || entry.intervals.length >= 3) return;
    updateDay(day, { intervals: [...entry.intervals, { opensAt: "09:00", closesAt: "18:00" }] });
  }

  function updateInterval(day: Weekday, index: number, patch: Partial<{ opensAt: string; closesAt: string }>) {
    const entry = values.openingHours.find((e) => e.day === day);
    if (!entry) return;
    updateDay(day, { intervals: entry.intervals.map((interval, i) => (i === index ? { ...interval, ...patch } : interval)) });
  }

  function removeInterval(day: Weekday, index: number) {
    const entry = values.openingHours.find((e) => e.day === day);
    if (!entry) return;
    updateDay(day, { intervals: entry.intervals.filter((_, i) => i !== index) });
  }

  /** Closing a day clears its intervals; reopening it restores a sensible default range, so a day can never be "open" with no hours. */
  function setDayClosed(day: Weekday, closed: boolean) {
    const entry = values.openingHours.find((e) => e.day === day);
    if (!entry) return;
    updateDay(day, { closed, intervals: closed ? [] : entry.intervals.length > 0 ? entry.intervals : [{ opensAt: "09:00", closesAt: "18:00" }] });
  }

  function copyHoursToAllDays(day: Weekday) {
    const source = values.openingHours.find((e) => e.day === day);
    if (!source) return;
    update(
      "openingHours",
      values.openingHours.map((entry) => (entry.day === day ? entry : { ...entry, closed: source.closed, intervals: source.intervals.map((i) => ({ ...i })) })),
    );
  }

  function handleSave() {
    setMessage(null);
    setFieldErrors({});
    startTransition(async () => {
      let result: EditorSaveResult;
      try {
        result = await saveAction(values);
      } catch {
        setMessage({ kind: "error", text: "השמירה נכשלה. בדקו את החיבור ונסו שוב." });
        return;
      }
      if (result.status === "success") {
        if (result.locked) {
          setLockedUntil({ nextEligibleAt: result.nextEligibleAt });
          setMessage({
            kind: "success",
            text: `העדכון נשמר בהצלחה. בחבילת Plus ניתן לשמור עריכה אחת בכל חודש${
              result.nextEligibleAt ? ` — העריכה הבאה תהיה זמינה החל מ-${formatJerusalemDate(result.nextEligibleAt)}` : ""
            }.`,
          });
        } else {
          setMessage({ kind: "success", text: "העדכון נשמר בהצלחה." });
        }
        return;
      }
      if (result.status === "validation-error") {
        setFieldErrors(result.fieldErrors);
        setMessage({ kind: "error", text: result.message });
        return;
      }
      setMessage({ kind: "error", text: result.message });
    });
  }

  const uploadLabel = (slot: string, idle: string) => (uploading === slot ? "מעלה תמונה…" : idle);

  return (
    <div className={styles.card}>
      <div className={styles.previewRow}>
        <Link href={previewHref} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
          {previewLabel} ↗
        </Link>
        {previewHint && <span className={styles.previewHint}>{previewHint}</span>}
      </div>

      {(lockedUntil || disabledReason) && (
        <p className={styles.lockedNote} role="status">
          {disabledReason ?? "העריכה החודשית שלך נוצלה. אפשר להמשיך לצפות בעסק, אך לא לשמור שינויים נוספים עד החודש הבא."}
        </p>
      )}

      <fieldset className={styles.fieldset} disabled={locked}>
        {/* ── פרטי העסק ─────────────────────────────── */}
        <section className={styles.section} aria-labelledby={id("h-details")}>
          <h2 id={id("h-details")} className={styles.sectionTitle}>
            פרטי העסק
          </h2>
          <div className={styles.field}>
            <label htmlFor={id("name")}>שם העסק</label>
            <input id={id("name")} value={values.businessName} onChange={(e) => update("businessName", e.target.value)} />
            <FieldErrors errors={fieldErrors.businessName} />
          </div>

          <div className={styles.field}>
            <span>קטגוריות</span>
            <div className={styles.checkboxGrid}>
              {CATEGORIES.map((category) => (
                <label key={category.id} className={styles.checkboxLabel}>
                  <input type="checkbox" checked={values.categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} />
                  {category.label}
                </label>
              ))}
            </div>
            <FieldErrors errors={fieldErrors.categoryIds} />
          </div>

          <div className={styles.field}>
            <label htmlFor={id("type")}>סוג עסק</label>
            <select id={id("type")} value={values.businessType} onChange={(e) => update("businessType", e.target.value)}>
              <option value="">בחרו סוג עסק</option>
              {BUSINESS_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldErrors errors={fieldErrors.businessType} />
          </div>

          <div className={styles.field}>
            <label htmlFor={id("short")}>תיאור קצר</label>
            <textarea id={id("short")} rows={2} value={values.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} />
            <FieldErrors errors={fieldErrors.shortDescription} />
          </div>
          <div className={styles.field}>
            <label htmlFor={id("full")}>אודות העסק</label>
            <textarea id={id("full")} rows={5} value={values.fullDescription} onChange={(e) => update("fullDescription", e.target.value)} />
            <FieldErrors errors={fieldErrors.fullDescription} />
          </div>

          <div className={styles.field}>
            <label htmlFor={id("address-type")}>סוג כתובת</label>
            <select id={id("address-type")} value={values.addressType} onChange={(e) => update("addressType", e.target.value as Values["addressType"])}>
              <option value="physical">כתובת פיזית</option>
              <option value="service-area">אזור שירות בלבד</option>
              <option value="both">שניהם</option>
            </select>
          </div>
          {values.addressType !== "service-area" && (
            <div className={styles.field}>
              <label htmlFor={id("address")}>כתובת</label>
              <input id={id("address")} value={values.address ?? ""} onChange={(e) => update("address", e.target.value)} />
              <FieldErrors errors={fieldErrors.address} />
            </div>
          )}
          {values.addressType !== "physical" && (
            <div className={styles.field}>
              <label htmlFor={id("area")}>אזור שירות</label>
              <input id={id("area")} value={values.serviceArea ?? ""} onChange={(e) => update("serviceArea", e.target.value)} />
              <FieldErrors errors={fieldErrors.serviceArea} />
            </div>
          )}
        </section>

        {/* ── תמונה ראשית ───────────────────────────── */}
        <section className={styles.section} aria-labelledby={id("h-cover")}>
          <h2 id={id("h-cover")} className={styles.sectionTitle}>
            תמונה ראשית
          </h2>
          {uploadError && (
            <p className={styles.fieldError} role="alert">
              {uploadError}
            </p>
          )}
          {values.coverImage.url ? (
            <div className={styles.imagePreviewWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-side preview of an image that is not yet published */}
              <img src={values.coverImage.url} alt={values.coverImage.alt || "התמונה הראשית"} className={styles.imagePreview} />
              <label className={styles.replaceButton} aria-busy={uploading === "cover"}>
                {uploadLabel("cover", "החלפת תמונה")}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverSelect} disabled={busy} className={styles.imageInput} />
              </label>
            </div>
          ) : (
            <label className={styles.uploadTile} aria-busy={uploading === "cover"}>
              {uploadLabel("cover", "העלאת תמונה ראשית (JPG / PNG / WebP)")}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverSelect} disabled={busy} className={styles.imageInput} />
            </label>
          )}
          <p className={styles.hint}>התמונה מוצגת בראש עמוד העסק ובכרטיס העסק בארכיון. עד 5MB.</p>
          <FieldErrors errors={fieldErrors.coverImage} />
        </section>

        {/* ── גלריה ─────────────────────────────────── */}
        <section className={styles.section} aria-labelledby={id("h-gallery")}>
          <h2 id={id("h-gallery")} className={styles.sectionTitle}>
            גלריה
          </h2>
          <p className={styles.hint}>
            עד {MAX_GALLERY} תמונות נוספות ({values.gallery.length}/{MAX_GALLERY}). אפשר לשנות את הסדר בחצים.
          </p>
          <div className={styles.galleryGrid}>
            {values.gallery.map((image, index) => (
              <div key={image.url} className={styles.imagePreviewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-side preview of an image that is not yet published */}
                <img src={image.url} alt={image.alt || `תמונת גלריה ${index + 1}`} className={styles.imagePreview} />
                <div className={styles.tileActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => moveGalleryImage(index, -1)}
                    disabled={index === 0}
                    aria-label={`הקדמת תמונה ${index + 1}`}
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => moveGalleryImage(index, 1)}
                    disabled={index === values.gallery.length - 1}
                    aria-label={`דחיית תמונה ${index + 1}`}
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <Button type="button" variant="secondary" size="compact" onClick={() => removeGalleryImage(index)}>
                    הסרה
                  </Button>
                </div>
              </div>
            ))}
            {values.gallery.length < MAX_GALLERY && (
              <label className={styles.uploadTile} aria-busy={uploading === "gallery"}>
                {uploadLabel("gallery", "הוספת תמונה")}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleGallerySelect} disabled={busy} className={styles.imageInput} />
              </label>
            )}
          </div>
          <FieldErrors errors={fieldErrors.gallery} />
        </section>

        {/* ── שירותים ───────────────────────────────── */}
        <section className={styles.section} aria-labelledby={id("h-services")}>
          <h2 id={id("h-services")} className={styles.sectionTitle}>
            שירותים
          </h2>
          <FieldErrors errors={fieldErrors.services} />
          <div className={styles.itemList}>
            {values.services.map((service, index) => (
              <div key={index} className={styles.itemCard}>
                <div className={styles.field}>
                  <label htmlFor={id(`service-title-${index}`)}>שם השירות</label>
                  <input id={id(`service-title-${index}`)} value={service.title} onChange={(e) => updateService(index, { title: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label htmlFor={id(`service-desc-${index}`)}>תיאור</label>
                  <textarea id={id(`service-desc-${index}`)} rows={2} value={service.description ?? ""} onChange={(e) => updateService(index, { description: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label htmlFor={id(`service-price-${index}`)}>מחיר / תווית מחיר</label>
                  <input id={id(`service-price-${index}`)} value={service.priceLabel ?? ""} onChange={(e) => updateService(index, { priceLabel: e.target.value })} />
                </div>
                <div className={styles.itemActions}>
                  <button type="button" className={styles.iconButton} onClick={() => update("services", move(values.services, index, index - 1))} disabled={index === 0} aria-label={`הזזת שירות ${index + 1} למעלה`}>
                    <ArrowUp size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => update("services", move(values.services, index, index + 1))}
                    disabled={index === values.services.length - 1}
                    aria-label={`הזזת שירות ${index + 1} למטה`}
                  >
                    <ArrowDown size={18} aria-hidden="true" />
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => update("services", values.services.filter((_, i) => i !== index))}
                    disabled={values.services.length <= 1}
                  >
                    הסרת שירות
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => update("services", [...values.services, { title: "", description: "", priceLabel: "" }])}
            disabled={values.services.length >= MAX_SERVICES}
          >
            הוספת שירות
          </Button>
        </section>

        {/* ── שעות פעילות ───────────────────────────── */}
        <section className={styles.section} aria-labelledby={id("h-hours")}>
          <h2 id={id("h-hours")} className={styles.sectionTitle}>
            שעות פעילות
          </h2>
          <FieldErrors errors={fieldErrors.openingHours} />
          <div className={styles.itemList}>
            {WEEKDAYS.map((day) => {
              const entry = values.openingHours.find((e) => e.day === day);
              if (!entry) return null;
              return (
                <div key={day} className={styles.hoursRow}>
                  <div className={styles.hoursDayHeader}>
                    <span className={styles.hoursDayLabel}>{WEEKDAY_LABEL[day]}</span>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" checked={entry.closed} onChange={(e) => setDayClosed(day, e.target.checked)} />
                      סגור
                    </label>
                    <Button type="button" variant="secondary" size="compact" onClick={() => copyHoursToAllDays(day)}>
                      העתקה לכל הימים
                    </Button>
                  </div>
                  {!entry.closed && (
                    <div className={styles.intervalsList}>
                      {entry.intervals.map((interval, index) => (
                        <div key={index} className={styles.intervalRow}>
                          <input
                            type="time"
                            dir="ltr"
                            aria-label={`${WEEKDAY_LABEL[day]} — שעת פתיחה`}
                            value={interval.opensAt}
                            onChange={(e) => updateInterval(day, index, { opensAt: e.target.value })}
                          />
                          <span>עד</span>
                          <input
                            type="time"
                            dir="ltr"
                            aria-label={`${WEEKDAY_LABEL[day]} — שעת סגירה`}
                            value={interval.closesAt}
                            onChange={(e) => updateInterval(day, index, { closesAt: e.target.value })}
                          />
                          <Button type="button" variant="secondary" size="compact" onClick={() => removeInterval(day, index)} disabled={entry.intervals.length <= 1}>
                            הסרה
                          </Button>
                        </div>
                      ))}
                      {entry.intervals.length < 3 && (
                        <Button type="button" variant="secondary" size="compact" onClick={() => addInterval(day)}>
                          הוספת טווח שעות
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── פרטי קשר ורשתות חברתיות ───────────────── */}
        <section className={styles.section} aria-labelledby={id("h-contact")}>
          <h2 id={id("h-contact")} className={styles.sectionTitle}>
            פרטי קשר ורשתות חברתיות
          </h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor={id("phone")}>טלפון</label>
              <input id={id("phone")} type="tel" dir="ltr" value={values.publicPhone} onChange={(e) => update("publicPhone", e.target.value)} />
              <FieldErrors errors={fieldErrors.publicPhone} />
            </div>
            <div className={styles.field}>
              <label htmlFor={id("whatsapp")}>וואטסאפ</label>
              <input id={id("whatsapp")} type="tel" dir="ltr" value={values.publicWhatsapp} onChange={(e) => update("publicWhatsapp", e.target.value)} />
              <FieldErrors errors={fieldErrors.publicWhatsapp} />
            </div>
            <div className={styles.field}>
              <label htmlFor={id("email")}>אימייל</label>
              <input id={id("email")} type="email" dir="ltr" value={values.publicEmail} onChange={(e) => update("publicEmail", e.target.value)} />
              <FieldErrors errors={fieldErrors.publicEmail} />
            </div>
            <div className={styles.field}>
              <label htmlFor={id("website")}>אתר אינטרנט</label>
              <input id={id("website")} dir="ltr" placeholder="https://" value={values.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} />
              <FieldErrors errors={fieldErrors.websiteUrl} />
            </div>
            <div className={styles.field}>
              <label htmlFor={id("instagram")}>אינסטגרם</label>
              <input id={id("instagram")} dir="ltr" placeholder="https://instagram.com/…" value={values.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} />
              <FieldErrors errors={fieldErrors.instagramUrl} />
            </div>
            <div className={styles.field}>
              <label htmlFor={id("facebook")}>פייסבוק</label>
              <input id={id("facebook")} dir="ltr" placeholder="https://facebook.com/…" value={values.facebookUrl} onChange={(e) => update("facebookUrl", e.target.value)} />
              <FieldErrors errors={fieldErrors.facebookUrl} />
            </div>
            <div className={styles.field}>
              <label htmlFor={id("tiktok")}>טיקטוק</label>
              <input id={id("tiktok")} dir="ltr" placeholder="https://tiktok.com/@…" value={values.tiktokUrl} onChange={(e) => update("tiktokUrl", e.target.value)} />
              <FieldErrors errors={fieldErrors.tiktokUrl} />
            </div>
          </div>
        </section>

        {/* ── המלצות ────────────────────────────────── */}
        <section className={styles.section} aria-labelledby={id("h-testimonials")}>
          <h2 id={id("h-testimonials")} className={styles.sectionTitle}>
            המלצות
          </h2>
          <p className={styles.hint}>המלצות שבחרתם להציג בעמוד העסק. הן נפרדות מביקורות הגולשים, שמאושרות על ידי צוות הפורטל.</p>
          <FieldErrors errors={fieldErrors.testimonials} />
          <div className={styles.itemList}>
            {values.testimonials.map((testimonial, index) => (
              <div key={index} className={styles.itemCard}>
                <div className={styles.field}>
                  <label htmlFor={id(`t-author-${index}`)}>שם הממליץ/ה</label>
                  <input id={id(`t-author-${index}`)} value={testimonial.authorName} onChange={(e) => updateTestimonial(index, { authorName: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label htmlFor={id(`t-text-${index}`)}>תוכן ההמלצה</label>
                  <textarea id={id(`t-text-${index}`)} rows={3} value={testimonial.text} onChange={(e) => updateTestimonial(index, { text: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label htmlFor={id(`t-role-${index}`)}>תפקיד / עסק (לא חובה)</label>
                  <input id={id(`t-role-${index}`)} value={testimonial.roleOrContext ?? ""} onChange={(e) => updateTestimonial(index, { roleOrContext: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <span>תמונה (לא חובה)</span>
                  <div className={styles.avatarRow}>
                    {testimonial.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- owner-side preview of an image that is not yet published
                      <img src={testimonial.imageUrl} alt="" className={styles.avatarPreview} />
                    )}
                    <label className={styles.replaceButton} aria-busy={uploading === `testimonial-${index}`}>
                      {uploadLabel(`testimonial-${index}`, testimonial.imageUrl ? "החלפת תמונה" : "הוספת תמונה")}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleTestimonialImage(index, e)} disabled={busy} className={styles.imageInput} />
                    </label>
                    {testimonial.imageUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() => {
                          const previous = testimonial.imageUrl;
                          updateTestimonial(index, { imageUrl: undefined });
                          if (previous && removeMediaAction) void removeMediaAction(previous);
                        }}
                      >
                        הסרת תמונה
                      </Button>
                    )}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button type="button" className={styles.iconButton} onClick={() => update("testimonials", move(values.testimonials, index, index - 1))} disabled={index === 0} aria-label={`הזזת המלצה ${index + 1} למעלה`}>
                    <ArrowUp size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => update("testimonials", move(values.testimonials, index, index + 1))}
                    disabled={index === values.testimonials.length - 1}
                    aria-label={`הזזת המלצה ${index + 1} למטה`}
                  >
                    <ArrowDown size={18} aria-hidden="true" />
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => {
                      const previous = testimonial.imageUrl;
                      update("testimonials", values.testimonials.filter((_, i) => i !== index));
                      if (previous && removeMediaAction) void removeMediaAction(previous);
                    }}
                  >
                    הסרת המלצה
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => update("testimonials", [...values.testimonials, { authorName: "", text: "", roleOrContext: "" }])}
            disabled={values.testimonials.length >= MAX_TESTIMONIALS}
          >
            הוספת המלצה
          </Button>
        </section>

        {/* ── מבצע ──────────────────────────────────── */}
        <section className={styles.section} aria-labelledby={id("h-promo")}>
          <h2 id={id("h-promo")} className={styles.sectionTitle}>
            מבצע
          </h2>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={values.promotion !== null}
              onChange={(e) => update("promotion", e.target.checked ? { title: "", description: "", validUntil: "" } : null)}
            />
            יש מבצע פעיל
          </label>
          {values.promotion && (
            <>
              <div className={styles.field}>
                <label htmlFor={id("promo-title")}>כותרת המבצע</label>
                <input id={id("promo-title")} value={values.promotion.title} onChange={(e) => update("promotion", { ...values.promotion!, title: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label htmlFor={id("promo-desc")}>תיאור</label>
                <textarea id={id("promo-desc")} rows={2} value={values.promotion.description ?? ""} onChange={(e) => update("promotion", { ...values.promotion!, description: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label htmlFor={id("promo-until")}>בתוקף עד</label>
                <input id={id("promo-until")} value={values.promotion.validUntil ?? ""} onChange={(e) => update("promotion", { ...values.promotion!, validUntil: e.target.value })} />
              </div>
            </>
          )}
          <FieldErrors errors={fieldErrors.promotion} />
        </section>
      </fieldset>

      <div className={styles.saveBar}>
        {message && (
          <p className={message.kind === "success" ? styles.successMessage : styles.fieldError} role={message.kind === "success" ? "status" : "alert"}>
            {message.text}
          </p>
        )}
        <Button type="button" variant="accent" disabled={busy || locked} onClick={handleSave}>
          {isPending ? "שומר…" : uploading ? "מעלה תמונה…" : "שמירת השינויים"}
        </Button>
      </div>
    </div>
  );
}

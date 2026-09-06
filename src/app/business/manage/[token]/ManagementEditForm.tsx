"use client";

import { useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getVisibleBusinessCategories } from "@/data/business-categories";
import { BUSINESS_TYPE_OPTIONS, WEEKDAYS, WEEKDAY_LABEL } from "@/app/business/register/plus/schema";
import { updateManagedBusinessFieldsAction, uploadManagedBusinessMediaAction, deleteManagedBusinessMediaAction } from "./actions";
import type { BusinessManagementEditValues } from "./schema";
import styles from "./manage.module.css";

const CATEGORIES = getVisibleBusinessCategories();

type ManagementEditFormProps = {
  token: string;
  initialValues: BusinessManagementEditValues;
  businessSlug: string;
};

function fieldErrorsFor(fieldErrors: Record<string, string[]> | undefined, key: string): string[] {
  return fieldErrors?.[key] ?? [];
}

export function ManagementEditForm({ token, initialValues, businessSlug }: ManagementEditFormProps) {
  const [values, setValues] = useState<BusinessManagementEditValues>(initialValues);
  const [isPending, startTransition] = useTransition();
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function update<K extends keyof BusinessManagementEditValues>(key: K, value: BusinessManagementEditValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleCategory(categoryId: string) {
    setValues((v) => {
      const has = v.categoryIds.includes(categoryId);
      const categoryIds = has ? v.categoryIds.filter((id) => id !== categoryId) : [...v.categoryIds, categoryId];
      return { ...v, categoryIds };
    });
  }

  async function handleCoverSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError("");
    setIsUploadingCover(true);
    const result = await uploadManagedBusinessMediaAction(token, "cover", (() => {
      const formData = new FormData();
      formData.set("file", file);
      return formData;
    })());
    setIsUploadingCover(false);
    if (!result.success) {
      setUploadError(result.message);
      return;
    }
    const previousUrl = values.coverImage.url;
    update("coverImage", { url: result.url, alt: values.coverImage.alt || values.businessName });
    if (previousUrl) void deleteManagedBusinessMediaAction(token, previousUrl);
  }

  async function handleGallerySelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (values.gallery.length >= 7) {
      setUploadError("עד 7 תמונות גלריה נוספות (8 בסך הכול כולל התמונה הראשית).");
      return;
    }
    setUploadError("");
    setIsUploadingGallery(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadManagedBusinessMediaAction(token, "gallery", formData);
    setIsUploadingGallery(false);
    if (!result.success) {
      setUploadError(result.message);
      return;
    }
    update("gallery", [...values.gallery, { url: result.url, alt: values.businessName, order: values.gallery.length }]);
  }

  function removeGalleryImage(index: number) {
    const image = values.gallery[index];
    update(
      "gallery",
      values.gallery.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i })),
    );
    if (image?.url) void deleteManagedBusinessMediaAction(token, image.url);
  }

  function updateService(index: number, patch: Partial<BusinessManagementEditValues["services"][number]>) {
    update(
      "services",
      values.services.map((service, i) => (i === index ? { ...service, ...patch } : service)),
    );
  }

  function addService() {
    update("services", [...values.services, { title: "", description: "", priceLabel: "" }]);
  }

  function removeService(index: number) {
    update(
      "services",
      values.services.filter((_, i) => i !== index),
    );
  }

  function updateTestimonial(index: number, patch: Partial<BusinessManagementEditValues["testimonials"][number]>) {
    update(
      "testimonials",
      values.testimonials.map((testimonial, i) => (i === index ? { ...testimonial, ...patch } : testimonial)),
    );
  }

  function addTestimonial() {
    update("testimonials", [...values.testimonials, { authorName: "", text: "", roleOrContext: "" }]);
  }

  function removeTestimonial(index: number) {
    update(
      "testimonials",
      values.testimonials.filter((_, i) => i !== index),
    );
  }

  function updateDay(day: (typeof WEEKDAYS)[number], patch: Partial<BusinessManagementEditValues["openingHours"][number]>) {
    update(
      "openingHours",
      values.openingHours.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)),
    );
  }

  function addInterval(day: (typeof WEEKDAYS)[number]) {
    const entry = values.openingHours.find((e) => e.day === day);
    if (!entry || entry.intervals.length >= 3) return;
    updateDay(day, { intervals: [...entry.intervals, { opensAt: "09:00", closesAt: "18:00" }] });
  }

  function updateInterval(day: (typeof WEEKDAYS)[number], index: number, patch: Partial<{ opensAt: string; closesAt: string }>) {
    const entry = values.openingHours.find((e) => e.day === day);
    if (!entry) return;
    updateDay(day, { intervals: entry.intervals.map((interval, i) => (i === index ? { ...interval, ...patch } : interval)) });
  }

  function removeInterval(day: (typeof WEEKDAYS)[number], index: number) {
    const entry = values.openingHours.find((e) => e.day === day);
    if (!entry) return;
    updateDay(day, { intervals: entry.intervals.filter((_, i) => i !== index) });
  }

  function copyHoursToAllDays(day: (typeof WEEKDAYS)[number]) {
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
      const result = await updateManagedBusinessFieldsAction(token, values);
      if (result.status === "success") {
        setMessage({ kind: "success", text: "העדכון נשמר בהצלחה." });
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

  return (
    <div className={styles.card}>
      <Link href={`/businesses/${businessSlug}`} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
        צפייה בעמוד העסק ↗
      </Link>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פרטי בסיס</h2>
        <div className={styles.field}>
          <label htmlFor="mgmt-business-name">שם העסק</label>
          <input id="mgmt-business-name" value={values.businessName} onChange={(e) => update("businessName", e.target.value)} />
          {fieldErrorsFor(fieldErrors, "businessName").map((msg) => (
            <p key={msg} className={styles.fieldError}>
              {msg}
            </p>
          ))}
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
          {fieldErrorsFor(fieldErrors, "categoryIds").map((msg) => (
            <p key={msg} className={styles.fieldError}>
              {msg}
            </p>
          ))}
        </div>

        <div className={styles.field}>
          <label htmlFor="mgmt-business-type">סוג עסק</label>
          <select id="mgmt-business-type" value={values.businessType} onChange={(e) => update("businessType", e.target.value)}>
            <option value="">בחרו סוג עסק</option>
            {BUSINESS_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrorsFor(fieldErrors, "businessType").map((msg) => (
            <p key={msg} className={styles.fieldError}>
              {msg}
            </p>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>תיאור</h2>
        <div className={styles.field}>
          <label htmlFor="mgmt-short-desc">תיאור קצר</label>
          <textarea id="mgmt-short-desc" rows={2} value={values.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} />
          {fieldErrorsFor(fieldErrors, "shortDescription").map((msg) => (
            <p key={msg} className={styles.fieldError}>
              {msg}
            </p>
          ))}
        </div>
        <div className={styles.field}>
          <label htmlFor="mgmt-full-desc">תיאור מלא</label>
          <textarea id="mgmt-full-desc" rows={5} value={values.fullDescription} onChange={(e) => update("fullDescription", e.target.value)} />
          {fieldErrorsFor(fieldErrors, "fullDescription").map((msg) => (
            <p key={msg} className={styles.fieldError}>
              {msg}
            </p>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>תמונות</h2>
        {uploadError && <p className={styles.fieldError}>{uploadError}</p>}

        <div className={styles.field}>
          <span>תמונה ראשית</span>
          {values.coverImage.url ? (
            <div className={styles.imagePreviewWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element -- transient preview thumbnail during upload flow */}
              <img src={values.coverImage.url} alt={values.coverImage.alt || "תצוגה מקדימה"} className={styles.imagePreview} />
              <div className={styles.imagePreviewActions}>
                <label className={styles.replaceButton}>
                  {isUploadingCover ? "מעלה…" : "החלפת תמונה"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverSelect} disabled={isUploadingCover} className={styles.imageInput} />
                </label>
              </div>
            </div>
          ) : (
            <label className={styles.uploadTile}>
              {isUploadingCover ? "מעלה תמונה…" : "העלאת תמונה ראשית (JPG / PNG / WebP)"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverSelect} disabled={isUploadingCover} className={styles.imageInput} />
            </label>
          )}
          {fieldErrorsFor(fieldErrors, "coverImage").map((msg) => (
            <p key={msg} className={styles.fieldError}>
              {msg}
            </p>
          ))}
        </div>

        <div className={styles.field}>
          <span>גלריה (עד 7 תמונות נוספות)</span>
          <div className={styles.galleryGrid}>
            {values.gallery.map((image, index) => (
              <div key={image.url} className={styles.imagePreviewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element -- transient preview thumbnail during upload flow */}
                <img src={image.url} alt={image.alt || "תמונת גלריה"} className={styles.imagePreview} />
                <Button type="button" variant="secondary" size="compact" onClick={() => removeGalleryImage(index)}>
                  הסרה
                </Button>
              </div>
            ))}
            {values.gallery.length < 7 && (
              <label className={styles.uploadTile}>
                {isUploadingGallery ? "מעלה…" : "הוספת תמונה"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleGallerySelect} disabled={isUploadingGallery} className={styles.imageInput} />
              </label>
            )}
          </div>
          {fieldErrorsFor(fieldErrors, "gallery").map((msg) => (
            <p key={msg} className={styles.fieldError}>
              {msg}
            </p>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פרטי קשר ציבוריים</h2>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="mgmt-public-phone">טלפון ציבורי</label>
            <input id="mgmt-public-phone" dir="ltr" value={values.publicPhone} onChange={(e) => update("publicPhone", e.target.value)} />
            {fieldErrorsFor(fieldErrors, "publicPhone").map((msg) => (
              <p key={msg} className={styles.fieldError}>
                {msg}
              </p>
            ))}
          </div>
          <div className={styles.field}>
            <label htmlFor="mgmt-public-whatsapp">וואטסאפ ציבורי</label>
            <input id="mgmt-public-whatsapp" dir="ltr" value={values.publicWhatsapp} onChange={(e) => update("publicWhatsapp", e.target.value)} />
            {fieldErrorsFor(fieldErrors, "publicWhatsapp").map((msg) => (
              <p key={msg} className={styles.fieldError}>
                {msg}
              </p>
            ))}
          </div>
          <div className={styles.field}>
            <label htmlFor="mgmt-public-email">אימייל ציבורי</label>
            <input id="mgmt-public-email" dir="ltr" value={values.publicEmail} onChange={(e) => update("publicEmail", e.target.value)} />
            {fieldErrorsFor(fieldErrors, "publicEmail").map((msg) => (
              <p key={msg} className={styles.fieldError}>
                {msg}
              </p>
            ))}
          </div>
          <div className={styles.field}>
            <label htmlFor="mgmt-website">אתר אינטרנט</label>
            <input id="mgmt-website" dir="ltr" value={values.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} />
            {fieldErrorsFor(fieldErrors, "websiteUrl").map((msg) => (
              <p key={msg} className={styles.fieldError}>
                {msg}
              </p>
            ))}
          </div>
          <div className={styles.field}>
            <label htmlFor="mgmt-instagram">אינסטגרם</label>
            <input id="mgmt-instagram" dir="ltr" value={values.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="mgmt-facebook">פייסבוק</label>
            <input id="mgmt-facebook" dir="ltr" value={values.facebookUrl} onChange={(e) => update("facebookUrl", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="mgmt-tiktok">טיקטוק</label>
            <input id="mgmt-tiktok" dir="ltr" value={values.tiktokUrl} onChange={(e) => update("tiktokUrl", e.target.value)} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>כתובת</h2>
        <div className={styles.field}>
          <label htmlFor="mgmt-address-type">סוג כתובת</label>
          <select id="mgmt-address-type" value={values.addressType} onChange={(e) => update("addressType", e.target.value as BusinessManagementEditValues["addressType"])}>
            <option value="physical">כתובת פיזית</option>
            <option value="service-area">אזור שירות בלבד</option>
            <option value="both">שניהם</option>
          </select>
        </div>
        {values.addressType !== "service-area" && (
          <div className={styles.field}>
            <label htmlFor="mgmt-address">כתובת</label>
            <input id="mgmt-address" value={values.address} onChange={(e) => update("address", e.target.value)} />
            {fieldErrorsFor(fieldErrors, "address").map((msg) => (
              <p key={msg} className={styles.fieldError}>
                {msg}
              </p>
            ))}
          </div>
        )}
        {values.addressType !== "physical" && (
          <div className={styles.field}>
            <label htmlFor="mgmt-service-area">אזור שירות</label>
            <input id="mgmt-service-area" value={values.serviceArea} onChange={(e) => update("serviceArea", e.target.value)} />
            {fieldErrorsFor(fieldErrors, "serviceArea").map((msg) => (
              <p key={msg} className={styles.fieldError}>
                {msg}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>שירותים</h2>
        {fieldErrorsFor(fieldErrors, "services").map((msg) => (
          <p key={msg} className={styles.fieldError}>
            {msg}
          </p>
        ))}
        <div className={styles.itemList}>
          {values.services.map((service, index) => (
            <div key={index} className={styles.itemCard}>
              <div className={styles.field}>
                <label>שם השירות</label>
                <input value={service.title} onChange={(e) => updateService(index, { title: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>תיאור</label>
                <textarea rows={2} value={service.description ?? ""} onChange={(e) => updateService(index, { description: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>מחיר / תווית מחיר</label>
                <input value={service.priceLabel ?? ""} onChange={(e) => updateService(index, { priceLabel: e.target.value })} />
              </div>
              <Button type="button" variant="secondary" size="compact" onClick={() => removeService(index)} disabled={values.services.length <= 1}>
                הסרת שירות
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="compact" onClick={addService} disabled={values.services.length >= 12}>
          הוספת שירות
        </Button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>המלצות</h2>
        {fieldErrorsFor(fieldErrors, "testimonials").map((msg) => (
          <p key={msg} className={styles.fieldError}>
            {msg}
          </p>
        ))}
        <div className={styles.itemList}>
          {values.testimonials.map((testimonial, index) => (
            <div key={index} className={styles.itemCard}>
              <div className={styles.field}>
                <label>שם הממליץ/ה</label>
                <input value={testimonial.authorName} onChange={(e) => updateTestimonial(index, { authorName: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>תוכן ההמלצה</label>
                <textarea rows={2} value={testimonial.text} onChange={(e) => updateTestimonial(index, { text: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>תפקיד / הקשר</label>
                <input value={testimonial.roleOrContext ?? ""} onChange={(e) => updateTestimonial(index, { roleOrContext: e.target.value })} />
              </div>
              <Button type="button" variant="secondary" size="compact" onClick={() => removeTestimonial(index)}>
                הסרת המלצה
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="compact" onClick={addTestimonial} disabled={values.testimonials.length >= 10}>
          הוספת המלצה
        </Button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>שעות פעילות</h2>
        {fieldErrorsFor(fieldErrors, "openingHours").map((msg) => (
          <p key={msg} className={styles.fieldError}>
            {msg}
          </p>
        ))}
        <div className={styles.itemList}>
          {WEEKDAYS.map((day) => {
            const entry = values.openingHours.find((e) => e.day === day);
            if (!entry) return null;
            return (
              <div key={day} className={styles.hoursRow}>
                <div className={styles.hoursDayHeader}>
                  <span className={styles.hoursDayLabel}>{WEEKDAY_LABEL[day]}</span>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={entry.closed} onChange={(e) => updateDay(day, { closed: e.target.checked })} />
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
                        <input type="time" dir="ltr" value={interval.opensAt} onChange={(e) => updateInterval(day, index, { opensAt: e.target.value })} />
                        <span>עד</span>
                        <input type="time" dir="ltr" value={interval.closesAt} onChange={(e) => updateInterval(day, index, { closesAt: e.target.value })} />
                        <Button type="button" variant="secondary" size="compact" onClick={() => removeInterval(day, index)}>
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

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>מבצע</h2>
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
              <label>כותרת המבצע</label>
              <input value={values.promotion.title} onChange={(e) => update("promotion", { ...values.promotion!, title: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>תיאור</label>
              <textarea rows={2} value={values.promotion.description ?? ""} onChange={(e) => update("promotion", { ...values.promotion!, description: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>בתוקף עד</label>
              <input value={values.promotion.validUntil ?? ""} onChange={(e) => update("promotion", { ...values.promotion!, validUntil: e.target.value })} />
            </div>
          </>
        )}
        {fieldErrorsFor(fieldErrors, "promotion").map((msg) => (
          <p key={msg} className={styles.fieldError}>
            {msg}
          </p>
        ))}
      </section>

      {message && <p className={message.kind === "success" ? styles.successMessage : styles.fieldError}>{message.text}</p>}

      <div className={styles.formActions}>
        <Button type="button" variant="accent" disabled={isPending || isUploadingCover || isUploadingGallery} onClick={handleSave}>
          {isPending ? "שומר…" : "שמירת השינויים"}
        </Button>
      </div>
    </div>
  );
}

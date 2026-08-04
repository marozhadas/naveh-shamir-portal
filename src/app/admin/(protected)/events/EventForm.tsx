"use client";

import { useActionState, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EVENT_AUDIENCE_LABEL, EVENT_AUDIENCE_OPTIONS } from "@/types/community-event";
import { saveEventAction, uploadEventImageAction, type EventSaveActionState } from "./actions";
import { EMPTY_EVENT_FORM_VALUES, type EventFormValues } from "./schema";
import { slugify } from "@/utils/slugify";
import type { CommunityEventRow } from "@/types/community-event";
import styles from "./events-admin.module.css";

function rowToFormValues(event: CommunityEventRow): EventFormValues {
  return {
    title: event.title,
    slug: event.slug,
    shortDescription: event.short_description,
    fullDescription: event.full_description,
    audience: event.audience,
    category: event.category ?? "",
    eventDate: event.event_date,
    startTime: event.start_time.slice(0, 5),
    endTime: event.end_time?.slice(0, 5) ?? "",
    locationName: event.location_name,
    address: event.address ?? "",
    isFree: event.is_free,
    priceText: event.price_text ?? "",
    registrationUrl: event.registration_url ?? "",
    contactPhone: event.contact_phone ?? "",
    whatsapp: event.whatsapp ?? "",
    featured: event.featured,
    displayOrder: String(event.display_order),
  };
}

type EventFormProps = {
  /** Absent for create, present for edit. */
  event?: CommunityEventRow;
};

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const boundAction = (prevState: EventSaveActionState, formData: FormData) => saveEventAction(event?.id, prevState, formData);
  const initialState: EventSaveActionState = { status: "idle", values: event ? rowToFormValues(event) : EMPTY_EVENT_FORM_VALUES };
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const [values, setValues] = useState<EventFormValues>(initialState.values);
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const [imageUrl, setImageUrl] = useState(event?.image_url ?? "");
  const [imageAlt, setImageAlt] = useState(event?.image_alt ?? "");
  const [imageError, setImageError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const draftIdRef = useRef<string>(event?.id ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : "draft"));

  const [previousState, setPreviousState] = useState(state);
  if (previousState !== state) {
    setPreviousState(state);
    if (state.status !== "idle") setValues(state.values);
  }

  const titleId = useId();
  const slugId = useId();
  const shortId = useId();
  const fullId = useId();
  const categoryId = useId();
  const dateId = useId();
  const startId = useId();
  const endId = useId();
  const locationId = useId();
  const addressId = useId();
  const priceId = useId();
  const regUrlId = useId();
  const phoneId = useId();
  const waId = useId();
  const orderId = useId();

  function fieldError(field: keyof EventFormValues): string | undefined {
    return state.status === "validation-error" ? state.fieldErrors?.[field]?.[0] : undefined;
  }

  function updateField<Field extends keyof EventFormValues>(field: Field) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = e.target;
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setValues((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
  }

  function toggleAudience(value: string) {
    setValues((current) => ({
      ...current,
      audience: current.audience.includes(value) ? current.audience.filter((a) => a !== value) : [...current.audience, value],
    }));
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    setIsUploadingImage(true);
    const result = await uploadEventImageAction(draftIdRef.current, file);
    setIsUploadingImage(false);
    if (!result.success) {
      setImageError(result.message);
      return;
    }
    setImageUrl(result.url);
    if (!imageAlt) setImageAlt(values.title);
  }

  const isPastDate = values.eventDate && values.eventDate < new Date().toISOString().slice(0, 10);

  if (state.status === "success" && state.savedEvent) {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>{state.savedEvent.status === "published" ? "האירוע פורסם בהצלחה!" : "האירוע נשמר כטיוטה."}</p>
        <div className={styles.successActions}>
          <Button href="/admin/events" variant="secondary">
            חזרה לרשימת האירועים
          </Button>
          {state.savedEvent.status === "published" && (
            <Button href={`/events/${state.savedEvent.slug}`} variant="accent" target="_blank" rel="noopener noreferrer">
              צפייה באירוע
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.status === "server-error" && state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      {state.status === "validation-error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="imageAlt" value={imageAlt} />
      <input type="hidden" name="previousImageUrl" value={event?.image_url ?? ""} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פרטים בסיסיים</h2>
        <div className={`${styles.field} ${fieldError("title") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={titleId}>שם האירוע *</label>
          <input id={titleId} name="title" value={values.title} onChange={handleTitleChange} aria-invalid={Boolean(fieldError("title"))} />
          {fieldError("title") && <p className={styles.fieldErrorMessage}>{fieldError("title")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("slug") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={slugId}>
            Slug (כתובת) * <span className={styles.hint}>— אוטומטי משם האירוע, ניתן לעריכה</span>
          </label>
          <input
            id={slugId}
            name="slug"
            dir="ltr"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              updateField("slug")(e);
            }}
            aria-invalid={Boolean(fieldError("slug"))}
          />
          {fieldError("slug") && <p className={styles.fieldErrorMessage}>{fieldError("slug")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("shortDescription") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={shortId}>תיאור קצר *</label>
          <input id={shortId} name="shortDescription" maxLength={200} value={values.shortDescription} onChange={updateField("shortDescription")} aria-invalid={Boolean(fieldError("shortDescription"))} />
          {fieldError("shortDescription") && <p className={styles.fieldErrorMessage}>{fieldError("shortDescription")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("fullDescription") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={fullId}>תיאור מלא *</label>
          <textarea id={fullId} name="fullDescription" rows={6} maxLength={3000} value={values.fullDescription} onChange={updateField("fullDescription")} aria-invalid={Boolean(fieldError("fullDescription"))} />
          {fieldError("fullDescription") && <p className={styles.fieldErrorMessage}>{fieldError("fullDescription")}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor={categoryId}>קטגוריה (אופציונלי)</label>
          <input id={categoryId} name="category" value={values.category} onChange={updateField("category")} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>קהל יעד</h2>
        <div className={`${styles.audienceGroup} ${fieldError("audience") ? styles.fieldInvalid : ""}`} role="group" aria-label="קהל יעד">
          {EVENT_AUDIENCE_OPTIONS.map((option) => (
            <label key={option} className={styles.checkboxLabel}>
              <input type="checkbox" name="audience" value={option} checked={values.audience.includes(option)} onChange={() => toggleAudience(option)} />
              {EVENT_AUDIENCE_LABEL[option]}
            </label>
          ))}
        </div>
        {fieldError("audience") && <p className={styles.fieldErrorMessage}>{fieldError("audience")}</p>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>תאריך ושעה</h2>
        <div className={styles.row}>
          <div className={`${styles.field} ${fieldError("eventDate") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={dateId}>תאריך *</label>
            <input id={dateId} name="eventDate" type="date" value={values.eventDate} onChange={updateField("eventDate")} aria-invalid={Boolean(fieldError("eventDate"))} />
            {fieldError("eventDate") && <p className={styles.fieldErrorMessage}>{fieldError("eventDate")}</p>}
            {isPastDate && !fieldError("eventDate") && <p className={styles.warning}>שימו לב — התאריך שנבחר כבר עבר.</p>}
          </div>
          <div className={`${styles.field} ${fieldError("startTime") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={startId}>שעת התחלה *</label>
            <input id={startId} name="startTime" type="time" value={values.startTime} onChange={updateField("startTime")} aria-invalid={Boolean(fieldError("startTime"))} />
            {fieldError("startTime") && <p className={styles.fieldErrorMessage}>{fieldError("startTime")}</p>}
          </div>
          <div className={`${styles.field} ${fieldError("endTime") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={endId}>שעת סיום (אופציונלי)</label>
            <input id={endId} name="endTime" type="time" value={values.endTime} onChange={updateField("endTime")} aria-invalid={Boolean(fieldError("endTime"))} />
            {fieldError("endTime") && <p className={styles.fieldErrorMessage}>{fieldError("endTime")}</p>}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>מיקום</h2>
        <div className={styles.row}>
          <div className={`${styles.field} ${fieldError("locationName") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={locationId}>שם המקום *</label>
            <input id={locationId} name="locationName" value={values.locationName} onChange={updateField("locationName")} aria-invalid={Boolean(fieldError("locationName"))} />
            {fieldError("locationName") && <p className={styles.fieldErrorMessage}>{fieldError("locationName")}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor={addressId}>כתובת (אופציונלי)</label>
            <input id={addressId} name="address" value={values.address} onChange={updateField("address")} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>תמונה</h2>
        {imageUrl ? (
          <div className={styles.imagePreviewWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element -- transient preview thumbnail during upload flow */}
            <img src={imageUrl} alt={imageAlt || "תצוגה מקדימה"} className={styles.imagePreview} />
            <div className={styles.imagePreviewActions}>
              <label className={styles.replaceButton}>
                החלפת תמונה
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} disabled={isUploadingImage} className={styles.imageInput} />
              </label>
              <Button type="button" variant="secondary" size="compact" onClick={() => setImageUrl("")}>
                הסרה
              </Button>
            </div>
          </div>
        ) : (
          <label className={styles.uploadTile}>
            {isUploadingImage ? "מעלה תמונה…" : "העלאת תמונה (JPG / PNG / WebP)"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} disabled={isUploadingImage} className={styles.imageInput} />
          </label>
        )}
        {imageUrl && (
          <div className={styles.field}>
            <label>טקסט חלופי לתמונה (alt)</label>
            <input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
          </div>
        )}
        {imageError && <p className={styles.fieldErrorMessage}>{imageError}</p>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>מחיר והרשמה</h2>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="isFree" checked={values.isFree} onChange={updateField("isFree")} />
          הכניסה חופשית
        </label>
        {!values.isFree && (
          <div className={`${styles.field} ${fieldError("priceText") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={priceId}>מחיר / טקסט מחיר *</label>
            <input id={priceId} name="priceText" placeholder="לדוגמה: 30 ₪ למשתתף" value={values.priceText} onChange={updateField("priceText")} aria-invalid={Boolean(fieldError("priceText"))} />
            {fieldError("priceText") && <p className={styles.fieldErrorMessage}>{fieldError("priceText")}</p>}
          </div>
        )}
        <div className={`${styles.field} ${fieldError("registrationUrl") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={regUrlId}>קישור הרשמה (אופציונלי)</label>
          <input id={regUrlId} name="registrationUrl" dir="ltr" placeholder="https://..." value={values.registrationUrl} onChange={updateField("registrationUrl")} aria-invalid={Boolean(fieldError("registrationUrl"))} />
          {fieldError("registrationUrl") && <p className={styles.fieldErrorMessage}>{fieldError("registrationUrl")}</p>}
        </div>
        <div className={styles.row}>
          <div className={`${styles.field} ${fieldError("contactPhone") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={phoneId}>טלפון (אופציונלי)</label>
            <input id={phoneId} name="contactPhone" dir="ltr" placeholder="+972500000000" value={values.contactPhone} onChange={updateField("contactPhone")} aria-invalid={Boolean(fieldError("contactPhone"))} />
            {fieldError("contactPhone") && <p className={styles.fieldErrorMessage}>{fieldError("contactPhone")}</p>}
          </div>
          <div className={`${styles.field} ${fieldError("whatsapp") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={waId}>וואטסאפ (אופציונלי)</label>
            <input id={waId} name="whatsapp" dir="ltr" placeholder="+972500000000" value={values.whatsapp} onChange={updateField("whatsapp")} aria-invalid={Boolean(fieldError("whatsapp"))} />
            {fieldError("whatsapp") && <p className={styles.fieldErrorMessage}>{fieldError("whatsapp")}</p>}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פרסום</h2>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="featured" checked={values.featured} onChange={updateField("featured")} />
          אירוע מומלץ (יוצג בעדיפות בעמוד הבית)
        </label>
        <div className={styles.field}>
          <label htmlFor={orderId}>סדר תצוגה (מספר גבוה יותר = קודם, בין אירועים באותו תאריך)</label>
          <input id={orderId} name="displayOrder" type="number" value={values.displayOrder} onChange={updateField("displayOrder")} />
        </div>
      </section>

      <div className={styles.formActions}>
        <Button type="submit" name="intent" value="draft" variant="secondary" disabled={isPending || isUploadingImage}>
          {isPending ? "שומר…" : "שמירת טיוטה"}
        </Button>
        <Button type="submit" name="intent" value="publish" variant="accent" disabled={isPending || isUploadingImage}>
          {isPending ? "שומר…" : "פרסום האירוע"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => router.push("/admin/events")}>
          ביטול
        </Button>
      </div>
    </form>
  );
}

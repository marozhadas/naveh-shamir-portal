"use client";

import { useActionState, useId, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getVisibleBusinessCategories } from "@/data/business-categories";
import { updateBusinessAction, uploadBusinessImageAction, type BusinessEditActionState } from "./actions";
import type { BusinessEditFormValues } from "./schema";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import styles from "./detail.module.css";

function rowToFormValues(registration: BusinessRegistrationRow): BusinessEditFormValues {
  return {
    businessName: registration.business_name,
    categoryId: registration.category_id,
    shortDescription: registration.short_description ?? "",
    description: registration.description,
    contactName: registration.contact_name,
    phone: registration.phone ?? "",
    whatsappPhone: registration.whatsapp_phone ?? "",
    email: registration.email ?? "",
    websiteUrl: registration.website_url ?? "",
    address: registration.address ?? "",
    serviceArea: registration.service_area ?? "",
    featured: registration.featured,
    verified: registration.verified,
  };
}

type BusinessEditFormProps = {
  registration: BusinessRegistrationRow;
};

const CATEGORIES = getVisibleBusinessCategories();

export function BusinessEditForm({ registration }: BusinessEditFormProps) {
  const router = useRouter();
  const boundAction = (prevState: BusinessEditActionState, formData: FormData) => updateBusinessAction(registration.id, prevState, formData);
  const initialState: BusinessEditActionState = { status: "idle", values: rowToFormValues(registration) };
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const [values, setValues] = useState<BusinessEditFormValues>(initialState.values);
  const [imageUrl, setImageUrl] = useState(registration.cover_image?.url ?? "");
  const [imageAlt, setImageAlt] = useState(registration.cover_image?.alt ?? "");
  const [imageError, setImageError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [previousState, setPreviousState] = useState(state);
  if (previousState !== state) {
    setPreviousState(state);
    if (state.status !== "idle") setValues(state.values);
  }

  const nameId = useId();
  const categoryId = useId();
  const shortId = useId();
  const descId = useId();
  const contactId = useId();
  const phoneId = useId();
  const waId = useId();
  const emailId = useId();
  const websiteId = useId();
  const addressId = useId();
  const areaId = useId();

  function fieldError(field: keyof BusinessEditFormValues): string | undefined {
    return state.status === "validation-error" ? state.fieldErrors?.[field]?.[0] : undefined;
  }

  function updateField<Field extends keyof BusinessEditFormValues>(field: Field) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = e.target;
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    setIsUploadingImage(true);
    const result = await uploadBusinessImageAction(registration.id, file);
    setIsUploadingImage(false);
    if (!result.success) {
      setImageError(result.message);
      return;
    }
    setImageUrl(result.url);
    if (!imageAlt) setImageAlt(values.businessName);
  }

  if (state.status === "success") {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>הפרטים נשמרו בהצלחה.</p>
        <div className={styles.successActions}>
          <Button href={`/admin/businesses/${registration.id}`} variant="secondary">
            חזרה לעמוד העסק
          </Button>
          <Button href="/admin/businesses" variant="accent">
            רשימת העסקים
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {(state.status === "server-error" || state.status === "validation-error") && state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="imageAlt" value={imageAlt} />
      <input type="hidden" name="previousImageUrl" value={registration.cover_image?.url ?? ""} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פרטים בסיסיים</h2>
        <div className={`${styles.field} ${fieldError("businessName") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={nameId}>שם העסק *</label>
          <input id={nameId} name="businessName" value={values.businessName} onChange={updateField("businessName")} aria-invalid={Boolean(fieldError("businessName"))} />
          {fieldError("businessName") && <p className={styles.fieldErrorMessage}>{fieldError("businessName")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("categoryId") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={categoryId}>קטגוריה *</label>
          <select id={categoryId} name="categoryId" value={values.categoryId} onChange={updateField("categoryId")} aria-invalid={Boolean(fieldError("categoryId"))}>
            <option value="">— בחירת קטגוריה —</option>
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          {fieldError("categoryId") && <p className={styles.fieldErrorMessage}>{fieldError("categoryId")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("shortDescription") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={shortId}>תיאור קצר (אופציונלי)</label>
          <input id={shortId} name="shortDescription" maxLength={200} value={values.shortDescription} onChange={updateField("shortDescription")} aria-invalid={Boolean(fieldError("shortDescription"))} />
          {fieldError("shortDescription") && <p className={styles.fieldErrorMessage}>{fieldError("shortDescription")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("description") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={descId}>תיאור *</label>
          <textarea id={descId} name="description" rows={6} maxLength={3000} value={values.description} onChange={updateField("description")} aria-invalid={Boolean(fieldError("description"))} />
          {fieldError("description") && <p className={styles.fieldErrorMessage}>{fieldError("description")}</p>}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>תמונה מייצגת</h2>
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
        <h2 className={styles.sectionTitle}>פרטי קשר</h2>
        <div className={`${styles.field} ${fieldError("contactName") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={contactId}>איש/אשת קשר *</label>
          <input id={contactId} name="contactName" value={values.contactName} onChange={updateField("contactName")} aria-invalid={Boolean(fieldError("contactName"))} />
          {fieldError("contactName") && <p className={styles.fieldErrorMessage}>{fieldError("contactName")}</p>}
        </div>
        <div className={styles.row}>
          <div className={`${styles.field} ${fieldError("phone") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={phoneId}>טלפון (אופציונלי)</label>
            <input id={phoneId} name="phone" dir="ltr" placeholder="+972500000000" value={values.phone} onChange={updateField("phone")} aria-invalid={Boolean(fieldError("phone"))} />
            {fieldError("phone") && <p className={styles.fieldErrorMessage}>{fieldError("phone")}</p>}
          </div>
          <div className={`${styles.field} ${fieldError("whatsappPhone") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={waId}>וואטסאפ (אופציונלי)</label>
            <input id={waId} name="whatsappPhone" dir="ltr" placeholder="+972500000000" value={values.whatsappPhone} onChange={updateField("whatsappPhone")} aria-invalid={Boolean(fieldError("whatsappPhone"))} />
            {fieldError("whatsappPhone") && <p className={styles.fieldErrorMessage}>{fieldError("whatsappPhone")}</p>}
          </div>
        </div>
        <div className={styles.row}>
          <div className={`${styles.field} ${fieldError("email") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={emailId}>אימייל (אופציונלי)</label>
            <input id={emailId} name="email" dir="ltr" type="email" value={values.email} onChange={updateField("email")} aria-invalid={Boolean(fieldError("email"))} />
            {fieldError("email") && <p className={styles.fieldErrorMessage}>{fieldError("email")}</p>}
          </div>
          <div className={`${styles.field} ${fieldError("websiteUrl") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={websiteId}>אתר (אופציונלי)</label>
            <input id={websiteId} name="websiteUrl" dir="ltr" placeholder="https://..." value={values.websiteUrl} onChange={updateField("websiteUrl")} aria-invalid={Boolean(fieldError("websiteUrl"))} />
            {fieldError("websiteUrl") && <p className={styles.fieldErrorMessage}>{fieldError("websiteUrl")}</p>}
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor={addressId}>כתובת (אופציונלי)</label>
            <input id={addressId} name="address" value={values.address} onChange={updateField("address")} />
          </div>
          <div className={styles.field}>
            <label htmlFor={areaId}>אזור שירות (אופציונלי)</label>
            <input id={areaId} name="serviceArea" value={values.serviceArea} onChange={updateField("serviceArea")} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>תגיות ניהוליות</h2>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="featured" checked={values.featured} onChange={updateField("featured")} />
          עסק מומלץ (מוצג בעדיפות)
        </label>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="verified" checked={values.verified} onChange={updateField("verified")} />
          עסק מאומת (מוצגת תגית &quot;מאומת&quot;)
        </label>
      </section>

      <div className={styles.formActions}>
        <Button type="submit" variant="accent" disabled={isPending || isUploadingImage}>
          {isPending ? "שומר…" : "שמירת שינויים"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => router.push(`/admin/businesses/${registration.id}`)}>
          ביטול
        </Button>
      </div>
    </form>
  );
}

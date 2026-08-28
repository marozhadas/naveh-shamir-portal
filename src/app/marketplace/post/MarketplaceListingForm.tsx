"use client";

import { useActionState, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getVisibleMarketplaceCategories } from "@/data/marketplace-categories";
import { MARKETPLACE_CONDITION_LABEL } from "@/types/marketplace";
import { submitMarketplaceListingAction, uploadMarketplaceImageAction, type MarketplaceListingActionState } from "./actions";
import { EMPTY_LISTING_FORM_VALUES, FIELD_ORDER, type MarketplaceListingFormValues } from "./schema";
import type { MarketplaceListingImage } from "@/types/marketplace";
import { ManagementLinkBox } from "./ManagementLinkBox";
import styles from "./post.module.css";

const CATEGORIES = getVisibleMarketplaceCategories();
const CONDITION_OPTIONS = Object.keys(MARKETPLACE_CONDITION_LABEL);
const MAX_IMAGES = 3;
const INITIAL_STATE: MarketplaceListingActionState = { status: "idle", values: EMPTY_LISTING_FORM_VALUES };

const FIELD_LABELS: Record<keyof MarketplaceListingFormValues, string> = {
  title: "שם הפריט",
  description: "תיאור",
  listingType: "סוג פרסום",
  categoryId: "קטגוריה",
  isFree: "חינם",
  price: "מחיר",
  condition: "מצב הפריט",
  area: "שכונה / אזור",
  contactName: "שם איש/אשת קשר",
  phone: "טלפון",
  whatsappPhone: "וואטסאפ",
};

function focusAndReveal(node: HTMLElement | null | undefined) {
  if (!node) return;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  node.focus();
  node.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
}

export function MarketplaceListingForm() {
  const [state, formAction, isPending] = useActionState(submitMarketplaceListingAction, INITIAL_STATE);
  const [values, setValues] = useState<MarketplaceListingFormValues>(EMPTY_LISTING_FORM_VALUES);
  const [images, setImages] = useState<MarketplaceListingImage[]>([]);
  const [imageError, setImageError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const draftIdRef = useRef<string>(typeof crypto !== "undefined" ? crypto.randomUUID() : "draft");

  const [previousState, setPreviousState] = useState(state);
  if (previousState !== state) {
    setPreviousState(state);
    if (state.status !== "idle") setValues(state.values);
    if (state.status === "success") setImages([]);
  }

  const titleId = useId();
  const descriptionId = useId();
  const listingTypeId = useId();
  const categoryId = useId();
  const priceId = useId();
  const conditionId = useId();
  const areaId = useId();
  const contactNameId = useId();
  const phoneId = useId();
  const whatsappId = useId();

  const fieldIds: Record<keyof MarketplaceListingFormValues, string> = {
    title: titleId,
    description: descriptionId,
    listingType: listingTypeId,
    categoryId,
    isFree: "",
    price: priceId,
    condition: conditionId,
    area: areaId,
    contactName: contactNameId,
    phone: phoneId,
    whatsappPhone: whatsappId,
  };

  function updateField<Field extends keyof MarketplaceListingFormValues>(field: Field) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = event.target;
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  function fieldError(field: keyof MarketplaceListingFormValues): string | undefined {
    return state.status === "validation-error" ? state.fieldErrors?.[field]?.[0] : undefined;
  }

  async function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (images.length >= MAX_IMAGES) {
      setImageError(`ניתן להעלות עד ${MAX_IMAGES} תמונות.`);
      return;
    }
    setImageError("");
    setIsUploading(true);
    const result = await uploadMarketplaceImageAction(draftIdRef.current, file);
    setIsUploading(false);
    if (!result.success) {
      setImageError(result.message);
      return;
    }
    setImages((current) => [...current, { src: result.url, alt: values.title || "תמונת מודעה" }]);
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  if (state.status === "success") {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>המודעה נשלחה בהצלחה!</p>
        <p className={styles.successDetail}>המודעה ממתינה לבדיקה ואישור של צוות הפורטל, ותופיע בלוח ברגע שתאושר.</p>
        {state.managementUrl && <ManagementLinkBox managementUrl={state.managementUrl} />}
        <Button href="/marketplace" variant="secondary">
          חזרה ללוח
        </Button>
      </div>
    );
  }

  const invalidFields = state.status === "validation-error" ? FIELD_ORDER.filter((field) => fieldError(field)) : [];

  return (
    <form
      action={(formData) => {
        formData.set("images", JSON.stringify(images));
        formAction(formData);
      }}
      className={styles.form}
      noValidate
    >
      {state.status === "server-error" && state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      {state.status === "validation-error" && invalidFields.length > 0 && (
        <div className={styles.summary} role="alert" aria-live="assertive">
          <p className={styles.summaryTitle}>יש כמה פרטים שצריך לתקן</p>
          <ul className={styles.summaryList}>
            {invalidFields.map((field) => (
              <li key={field}>
                <a
                  href={`#${fieldIds[field]}`}
                  onClick={(event) => {
                    event.preventDefault();
                    focusAndReveal(document.getElementById(fieldIds[field]));
                  }}
                >
                  {FIELD_LABELS[field]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`${styles.field} ${fieldError("title") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={titleId}>שם הפריט *</label>
        <input id={titleId} name="title" type="text" maxLength={120} value={values.title} onChange={updateField("title")} aria-invalid={Boolean(fieldError("title"))} />
        {fieldError("title") && <p className={styles.fieldErrorMessage}>{fieldError("title")}</p>}
      </div>

      <div className={`${styles.field} ${fieldError("description") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={descriptionId}>תיאור *</label>
        <textarea id={descriptionId} name="description" rows={4} maxLength={800} value={values.description} onChange={updateField("description")} aria-invalid={Boolean(fieldError("description"))} />
        {fieldError("description") && <p className={styles.fieldErrorMessage}>{fieldError("description")}</p>}
      </div>

      <div className={styles.row}>
        <div className={`${styles.field} ${fieldError("listingType") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={listingTypeId}>סוג פרסום *</label>
          <select id={listingTypeId} name="listingType" value={values.listingType} onChange={updateField("listingType")} aria-invalid={Boolean(fieldError("listingType"))}>
            <option value="" disabled>
              בחרו סוג
            </option>
            <option value="giveaway">מסירה</option>
            <option value="sale">מכירה</option>
          </select>
          {fieldError("listingType") && <p className={styles.fieldErrorMessage}>{fieldError("listingType")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("categoryId") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={categoryId}>קטגוריה *</label>
          <select id={categoryId} name="categoryId" value={values.categoryId} onChange={updateField("categoryId")} aria-invalid={Boolean(fieldError("categoryId"))}>
            <option value="" disabled>
              בחרו קטגוריה
            </option>
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          {fieldError("categoryId") && <p className={styles.fieldErrorMessage}>{fieldError("categoryId")}</p>}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="isFree" checked={values.isFree} onChange={updateField("isFree")} />
          הפריט ניתן במסירה חינם
        </label>
      </div>

      {!values.isFree && (
        <div className={`${styles.field} ${fieldError("price") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={priceId}>מחיר (₪) *</label>
          <input id={priceId} name="price" type="number" min={0} dir="ltr" value={values.price} onChange={updateField("price")} aria-invalid={Boolean(fieldError("price"))} />
          {fieldError("price") && <p className={styles.fieldErrorMessage}>{fieldError("price")}</p>}
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={conditionId}>מצב הפריט</label>
          <select id={conditionId} name="condition" value={values.condition} onChange={updateField("condition")}>
            <option value="">לא צוין</option>
            {CONDITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {MARKETPLACE_CONDITION_LABEL[option]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={areaId}>שכונה / אזור</label>
          <input id={areaId} name="area" type="text" value={values.area} onChange={updateField("area")} />
        </div>
      </div>

      <div className={styles.field}>
        <label>תמונות (עד {MAX_IMAGES})</label>
        <div className={styles.imageGrid}>
          {images.map((image, index) => (
            <div key={image.src} className={styles.imageThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element -- transient preview thumbnail, not worth next/image's overhead here */}
              <img src={image.src} alt={image.alt} />
              <button type="button" onClick={() => removeImage(index)} aria-label="הסרת תמונה" className={styles.imageRemove}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <label className={styles.imageUploadTile}>
              {isUploading ? "מעלה..." : "הוספת תמונה"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} disabled={isUploading} className={styles.imageInput} />
            </label>
          )}
        </div>
        {imageError && <p className={styles.fieldErrorMessage}>{imageError}</p>}
      </div>

      <div className={`${styles.field} ${fieldError("contactName") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={contactNameId}>שם איש/אשת קשר *</label>
        <input id={contactNameId} name="contactName" type="text" maxLength={120} value={values.contactName} onChange={updateField("contactName")} aria-invalid={Boolean(fieldError("contactName"))} />
        {fieldError("contactName") && <p className={styles.fieldErrorMessage}>{fieldError("contactName")}</p>}
      </div>

      <div className={styles.row}>
        <div className={`${styles.field} ${fieldError("phone") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={phoneId}>טלפון</label>
          <input id={phoneId} name="phone" type="tel" dir="ltr" placeholder="+972500000000" value={values.phone} onChange={updateField("phone")} aria-invalid={Boolean(fieldError("phone"))} />
          {fieldError("phone") && <p className={styles.fieldErrorMessage}>{fieldError("phone")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("whatsappPhone") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={whatsappId}>וואטסאפ</label>
          <input id={whatsappId} name="whatsappPhone" type="tel" dir="ltr" placeholder="+972500000000" value={values.whatsappPhone} onChange={updateField("whatsappPhone")} aria-invalid={Boolean(fieldError("whatsappPhone"))} />
          {fieldError("whatsappPhone") && <p className={styles.fieldErrorMessage}>{fieldError("whatsappPhone")}</p>}
        </div>
      </div>

      <p className={styles.hint}>יש להזין לפחות דרך התקשרות אחת (טלפון או וואטסאפ). המודעה תפורסם רק לאחר אישור צוות הפורטל.</p>

      <Button type="submit" variant="accent" disabled={isPending || isUploading}>
        {isPending ? "שולח…" : "שליחת מודעה"}
      </Button>
    </form>
  );
}

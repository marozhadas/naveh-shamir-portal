"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { getVisibleMarketplaceCategories } from "@/data/marketplace-categories";
import { MARKETPLACE_CONDITION_LABEL } from "@/types/marketplace";
import { formatListingDate } from "@/utils/format-listing-date";
import { updateMarketplaceListingFieldsAction } from "./actions";
import type { MarketplaceListingRow } from "@/types/marketplace";
import styles from "./marketplace-admin.module.css";

const CATEGORIES = getVisibleMarketplaceCategories();
const CONDITION_OPTIONS = Object.keys(MARKETPLACE_CONDITION_LABEL);

type EditableValues = {
  title: string;
  description: string;
  categoryId: string;
  isFree: boolean;
  price: string;
  condition: string;
  area: string;
  contactName: string;
  phone: string;
  whatsappPhone: string;
};

function toEditableValues(listing: MarketplaceListingRow): EditableValues {
  return {
    title: listing.title,
    description: listing.description,
    categoryId: listing.category_id,
    isFree: listing.is_free,
    price: listing.price !== null ? String(listing.price) : "",
    condition: listing.condition ?? "",
    area: listing.area ?? "",
    contactName: listing.contact_name,
    phone: listing.phone ?? "",
    whatsappPhone: listing.whatsapp_phone ?? "",
  };
}

type MarketplaceAdminDetailProps = {
  listing: MarketplaceListingRow;
  onSaved: (listing: MarketplaceListingRow) => void;
};

export function MarketplaceAdminDetail({ listing, onSaved }: MarketplaceAdminDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<EditableValues>(() => toEditableValues(listing));
  const [error, setError] = useState("");

  function startEditing() {
    setValues(toEditableValues(listing));
    setError("");
    setIsEditing(true);
  }

  function save() {
    if (!values.title.trim() || !values.description.trim() || !values.contactName.trim()) {
      setError("שם הפריט, תיאור ושם איש/אשת קשר הם שדות חובה.");
      return;
    }
    if (!values.phone.trim() && !values.whatsappPhone.trim()) {
      setError("יש להזין לפחות דרך התקשרות אחת (טלפון או וואטסאפ).");
      return;
    }
    const parsedPrice = values.isFree ? null : Number(values.price);
    if (!values.isFree && (Number.isNaN(parsedPrice) || (parsedPrice as number) < 0)) {
      setError("יש להזין מחיר תקין, או לסמן שהפריט חינם.");
      return;
    }

    setError("");
    startTransition(async () => {
      await updateMarketplaceListingFieldsAction(listing.id, {
        title: values.title.trim(),
        description: values.description.trim(),
        category_id: values.categoryId,
        is_free: values.isFree,
        price: parsedPrice,
        condition: values.condition || null,
        area: values.area.trim() || null,
        contact_name: values.contactName.trim(),
        phone: values.phone.trim() || null,
        whatsapp_phone: values.whatsappPhone.trim() || null,
      });
      onSaved({
        ...listing,
        title: values.title.trim(),
        description: values.description.trim(),
        category_id: values.categoryId,
        is_free: values.isFree,
        price: parsedPrice,
        condition: values.condition || null,
        area: values.area.trim() || null,
        contact_name: values.contactName.trim(),
        phone: values.phone.trim() || null,
        whatsapp_phone: values.whatsappPhone.trim() || null,
      });
      setIsEditing(false);
    });
  }

  if (isEditing) {
    return (
      <div className={styles.detail}>
        <div className={styles.editGrid}>
          <label className={styles.editField}>
            שם הפריט
            <input value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
          </label>
          <label className={styles.editField}>
            קטגוריה
            <select value={values.categoryId} onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.editField}>
            תיאור
            <textarea rows={3} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
          </label>
          <label className={styles.editCheckbox}>
            <input type="checkbox" checked={values.isFree} onChange={(e) => setValues((v) => ({ ...v, isFree: e.target.checked }))} />
            חינם
          </label>
          {!values.isFree && (
            <label className={styles.editField}>
              מחיר (₪)
              <input type="number" min={0} dir="ltr" value={values.price} onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))} />
            </label>
          )}
          <label className={styles.editField}>
            מצב הפריט
            <select value={values.condition} onChange={(e) => setValues((v) => ({ ...v, condition: e.target.value }))}>
              <option value="">לא צוין</option>
              {CONDITION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {MARKETPLACE_CONDITION_LABEL[option]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.editField}>
            שכונה / אזור
            <input value={values.area} onChange={(e) => setValues((v) => ({ ...v, area: e.target.value }))} />
          </label>
          <label className={styles.editField}>
            שם איש/אשת קשר
            <input value={values.contactName} onChange={(e) => setValues((v) => ({ ...v, contactName: e.target.value }))} />
          </label>
          <label className={styles.editField}>
            טלפון
            <input dir="ltr" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
          </label>
          <label className={styles.editField}>
            וואטסאפ
            <input dir="ltr" value={values.whatsappPhone} onChange={(e) => setValues((v) => ({ ...v, whatsappPhone: e.target.value }))} />
          </label>
        </div>

        {error && (
          <p className={styles.editError} role="alert">
            {error}
          </p>
        )}

        <div className={styles.editActions}>
          <Button variant="accent" size="compact" disabled={isPending} onClick={save}>
            {isPending ? "שומר…" : "שמירה"}
          </Button>
          <Button variant="secondary" size="compact" disabled={isPending} onClick={() => setIsEditing(false)}>
            ביטול
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detail}>
      {listing.images.length > 0 && (
        <div className={styles.detailImages}>
          {listing.images.map((image) => (
            <div key={image.src} className={styles.detailImageWrap}>
              <Image src={image.src} alt={image.alt} fill sizes="96px" className={styles.detailImage} />
            </div>
          ))}
        </div>
      )}

      <dl className={styles.detailList}>
        <div>
          <dt>תיאור</dt>
          <dd>{listing.description}</dd>
        </div>
        <div>
          <dt>מחיר</dt>
          <dd>{listing.is_free ? "חינם" : listing.price !== null ? `${listing.price} ₪` : "לא צוין"}</dd>
        </div>
        <div>
          <dt>מצב הפריט</dt>
          <dd>{listing.condition ? (MARKETPLACE_CONDITION_LABEL[listing.condition] ?? listing.condition) : "לא צוין"}</dd>
        </div>
        <div>
          <dt>שכונה / אזור</dt>
          <dd>{listing.area || "לא צוין"}</dd>
        </div>
        <div>
          <dt>טלפון</dt>
          <dd dir="ltr">{listing.phone || "—"}</dd>
        </div>
        <div>
          <dt>וואטסאפ</dt>
          <dd dir="ltr">{listing.whatsapp_phone || "—"}</dd>
        </div>
        <div>
          <dt>פורסם</dt>
          <dd>{formatListingDate(listing.created_at)}</dd>
        </div>
      </dl>

      <div className={styles.editActions}>
        <Button variant="secondary" size="compact" onClick={startEditing}>
          עריכת פרטים
        </Button>
      </div>
    </div>
  );
}

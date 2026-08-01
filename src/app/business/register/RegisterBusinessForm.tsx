"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { registerBusinessAction, type RegisterBusinessActionState } from "./actions";
import { getVisibleBusinessCategories } from "@/data/business-categories";
import styles from "./register.module.css";

const INITIAL_STATE: RegisterBusinessActionState = { error: null, success: false };
const CATEGORIES = getVisibleBusinessCategories();

export function RegisterBusinessForm() {
  const [state, formAction, isPending] = useActionState(registerBusinessAction, INITIAL_STATE);
  const nameId = useId();
  const categoryId = useId();
  const shortId = useId();
  const descriptionId = useId();
  const contactId = useId();
  const phoneId = useId();
  const whatsappId = useId();
  const emailId = useId();
  const websiteId = useId();
  const addressId = useId();
  const areaId = useId();

  if (state.success) {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>ההרשמה נשלחה בהצלחה!</p>
        <p className={styles.successDetail}>
          הפרטים ממתינים לבדיקה ואישור של צוות הפורטל. לאחר האישור העסק שלכם יופיע בארכיון העסקים.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor={nameId}>שם העסק *</label>
        <input id={nameId} name="businessName" type="text" required maxLength={120} />
      </div>

      <div className={styles.field}>
        <label htmlFor={categoryId}>קטגוריה *</label>
        <select id={categoryId} name="categoryId" required defaultValue="">
          <option value="" disabled>
            בחרו קטגוריה
          </option>
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={shortId}>תיאור קצר</label>
        <input id={shortId} name="shortDescription" type="text" maxLength={140} placeholder="משפט אחד שמסביר מה העסק עושה" />
      </div>

      <div className={styles.field}>
        <label htmlFor={descriptionId}>תיאור מלא *</label>
        <textarea id={descriptionId} name="description" required rows={5} maxLength={800} />
      </div>

      <div className={styles.field}>
        <label htmlFor={contactId}>שם איש/אשת קשר *</label>
        <input id={contactId} name="contactName" type="text" required maxLength={120} />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={phoneId}>טלפון</label>
          <input id={phoneId} name="phone" type="tel" dir="ltr" placeholder="+972500000000" />
        </div>
        <div className={styles.field}>
          <label htmlFor={whatsappId}>וואטסאפ</label>
          <input id={whatsappId} name="whatsappPhone" type="tel" dir="ltr" placeholder="+972500000000" />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={emailId}>אימייל</label>
          <input id={emailId} name="email" type="email" dir="ltr" />
        </div>
        <div className={styles.field}>
          <label htmlFor={websiteId}>אתר אינטרנט</label>
          <input id={websiteId} name="websiteUrl" type="text" dir="ltr" placeholder="https://..." />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={addressId}>כתובת</label>
          <input id={addressId} name="address" type="text" />
        </div>
        <div className={styles.field}>
          <label htmlFor={areaId}>אזור שירות</label>
          <input id={areaId} name="serviceArea" type="text" />
        </div>
      </div>

      <p className={styles.hint}>יש להזין לפחות דרך התקשרות אחת (טלפון, וואטסאפ או אימייל).</p>

      <Button type="submit" variant="accent" disabled={isPending}>
        {isPending ? "שולח…" : "שליחת הרשמה"}
      </Button>
    </form>
  );
}

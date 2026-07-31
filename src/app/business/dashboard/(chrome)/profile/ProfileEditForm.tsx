"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { updateProfileAction, type UpdateProfileActionState } from "../../profile-actions";
import { getBusinessContact } from "@/utils/business-profile";
import type { Business } from "@/types/business";
import styles from "./profile.module.css";

const INITIAL_STATE: UpdateProfileActionState = { error: null, success: false };

type ProfileEditFormProps = {
  business: Business;
};

export function ProfileEditForm({ business }: ProfileEditFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, INITIAL_STATE);
  const contact = getBusinessContact(business);
  const nameId = useId();
  const shortId = useId();
  const fullId = useId();
  const phoneId = useId();
  const whatsappId = useId();
  const websiteId = useId();
  const addressId = useId();
  const areaId = useId();

  return (
    <form action={formAction} className={styles.form}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state.success && !state.error && (
        <p className={styles.success} role="status">
          השינויים נשמרו בהצלחה.
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor={nameId}>שם העסק</label>
        <input id={nameId} name="name" type="text" defaultValue={business.name} required />
      </div>

      <div className={styles.field}>
        <label htmlFor={shortId}>תיאור קצר</label>
        <input id={shortId} name="shortDescription" type="text" defaultValue={business.shortDescription ?? ""} maxLength={140} />
      </div>

      <div className={styles.field}>
        <label htmlFor={fullId}>אודות העסק</label>
        <textarea id={fullId} name="fullDescription" rows={6} defaultValue={business.fullDescription ?? ""} />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={phoneId}>טלפון</label>
          <input id={phoneId} name="phone" type="tel" dir="ltr" defaultValue={contact.phone?.replace(/^tel:/, "") ?? ""} placeholder="+972500000000" />
        </div>
        <div className={styles.field}>
          <label htmlFor={whatsappId}>וואטסאפ</label>
          <input
            id={whatsappId}
            name="whatsappPhone"
            type="tel"
            dir="ltr"
            defaultValue={contact.whatsappUrl?.replace(/^https:\/\/wa\.me\//, "") ?? ""}
            placeholder="972500000000"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={websiteId}>אתר אינטרנט</label>
        <input id={websiteId} name="websiteUrl" type="text" dir="ltr" defaultValue={contact.websiteUrl ?? ""} placeholder="https://..." />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={addressId}>כתובת</label>
          <input id={addressId} name="address" type="text" defaultValue={business.location?.address ?? business.address ?? ""} />
        </div>
        <div className={styles.field}>
          <label htmlFor={areaId}>אזור שירות</label>
          <input id={areaId} name="serviceArea" type="text" defaultValue={business.location?.serviceArea ?? business.serviceArea ?? ""} />
        </div>
      </div>

      <Button type="submit" variant="accent" disabled={isPending}>
        {isPending ? "שומר…" : "שמירת שינויים"}
      </Button>
    </form>
  );
}

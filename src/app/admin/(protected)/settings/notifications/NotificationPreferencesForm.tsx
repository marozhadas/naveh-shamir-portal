"use client";

import { useActionState, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAdminNotificationSound } from "@/hooks/use-admin-notification-sound";
import { savePreferencesAction, type SavePreferencesActionState } from "./actions";
import type { AdminNotificationPreferences } from "@/types/admin-notification";
import styles from "./settings.module.css";

const INITIAL_STATE: SavePreferencesActionState = { error: null, success: false };

type NotificationPreferencesFormProps = {
  initialPreferences: AdminNotificationPreferences;
};

export function NotificationPreferencesForm({ initialPreferences }: NotificationPreferencesFormProps) {
  const [state, formAction, isPending] = useActionState(savePreferencesAction, INITIAL_STATE);
  const [soundEnabled, setSoundEnabled] = useState(initialPreferences.soundEnabled);
  const [emailEnabled, setEmailEnabled] = useState(initialPreferences.emailEnabled);
  const [types, setTypes] = useState(initialPreferences.notificationTypes);
  const playTestSound = useAdminNotificationSound(true);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.fieldGroup}>
        <h2 className={styles.groupTitle}>צליל התראות</h2>
        <div className={styles.soundRow}>
          <Checkbox checked={soundEnabled} onChange={setSoundEnabled} label="השמעת צליל בהתראה חדשה" />
          <input type="hidden" name="soundEnabled" value={soundEnabled ? "on" : "off"} />
          <Button type="button" variant="secondary" size="compact" icon={<Volume2 size={15} aria-hidden="true" />} onClick={playTestSound}>
            בדיקת צליל
          </Button>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <h2 className={styles.groupTitle}>מייל להתראות</h2>
        <Checkbox checked={emailEnabled} onChange={setEmailEnabled} label="שליחת מייל לאדמין בעת התראה חדשה" />
        <input type="hidden" name="emailEnabled" value={emailEnabled ? "on" : "off"} />
        <div className={styles.field}>
          <label htmlFor="emailAddress">כתובת מייל לקבלת התראות</label>
          <input id="emailAddress" name="emailAddress" type="email" dir="ltr" defaultValue={initialPreferences.emailAddress ?? ""} />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <h2 className={styles.groupTitle}>סוגי התראות</h2>
        <div className={styles.typesList}>
          <Checkbox
            checked={types.businessRegistration}
            onChange={(v) => setTypes((t) => ({ ...t, businessRegistration: v }))}
            label="עסק חדש נרשם"
          />
          <input type="hidden" name="businessRegistration" value={types.businessRegistration ? "on" : "off"} />

          <Checkbox
            checked={types.businessProfileUpdated}
            onChange={(v) => setTypes((t) => ({ ...t, businessProfileUpdated: v }))}
            label="עדכון פרופיל עסק"
          />
          <input type="hidden" name="businessProfileUpdated" value={types.businessProfileUpdated ? "on" : "off"} />

          <Checkbox
            checked={types.subscriptionExpiring}
            onChange={(v) => setTypes((t) => ({ ...t, subscriptionExpiring: v }))}
            label="מנוי עומד לפוג"
          />
          <input type="hidden" name="subscriptionExpiring" value={types.subscriptionExpiring ? "on" : "off"} />

          <Checkbox checked={types.paymentFailed} onChange={(v) => setTypes((t) => ({ ...t, paymentFailed: v }))} label="תשלום נכשל" />
          <input type="hidden" name="paymentFailed" value={types.paymentFailed ? "on" : "off"} />

          <Checkbox checked={types.contactMessage} onChange={(v) => setTypes((t) => ({ ...t, contactMessage: v }))} label="פנייה חדשה" />
          <input type="hidden" name="contactMessage" value={types.contactMessage ? "on" : "off"} />
        </div>
      </div>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className={styles.success} role="status">
          ההגדרות נשמרו.
        </p>
      )}

      <div className={styles.actionsRow}>
        <Button type="submit" variant="accent" disabled={isPending}>
          {isPending ? "שומר…" : "שמירת הגדרות"}
        </Button>
      </div>
    </form>
  );
}

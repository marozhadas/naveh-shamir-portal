"use client";

import { FlaskConical } from "lucide-react";
import { setDemoViewerAction } from "@/app/business/demo-actions";
import styles from "./ViewerSwitcher.module.css";

const DEMO_OPTIONS: { key: string; label: string }[] = [
  { key: "", label: "אורח/ת (לא מחובר/ת)" },
  { key: "owner-1", label: "בעלת סטודיו נועה — מנוי פעיל" },
  { key: "owner-3", label: "בעלת המטבח של רוני — בתקופת ניסיון" },
  { key: "owner-13", label: "בעל פיקס לבית — מנוי מבוטל (עדיין פעיל עד סוף התקופה)" },
  { key: "owner-2", label: "בעלת מספרת קו הבית — טרם התחיל/ה ניסיון" },
  { key: "owner-15", label: "בעל חשמלאי מוסמך — עסק מושעה" },
  { key: "admin-1", label: "מנהלת הפורטל" },
];

type ViewerSwitcherProps = {
  currentViewerId: string | null;
};

/**
 * A clearly-labeled demo-only control (spec section 48) — never a real login. Lets whoever is
 * testing the site switch which mock account the auth adapter reports as signed in, so the
 * trial/dashboard/subscription flows can actually be exercised without real authentication.
 */
export function ViewerSwitcher({ currentViewerId }: ViewerSwitcherProps) {
  return (
    <form action={setDemoViewerAction} className={styles.wrap}>
      <FlaskConical size={15} aria-hidden="true" className={styles.icon} />
      <label htmlFor="demo-viewer-select" className={styles.label}>
        מצב הדגמה — לא התחברות אמיתית — צפייה כ:
      </label>
      <select
        // Forces React to remount the element whenever the server-resolved viewer changes (e.g.
        // after a revalidatePath from this very form), so the displayed selection doesn't go
        // stale — `defaultValue` alone only applies on first mount, not on later re-renders.
        key={currentViewerId ?? "guest"}
        id="demo-viewer-select"
        name="viewer"
        defaultValue={currentViewerId ?? ""}
        className={styles.select}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {DEMO_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}

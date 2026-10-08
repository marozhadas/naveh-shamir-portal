import type { ChangeEvent, Ref } from "react";
import { PRIVACY_POLICY_PATH } from "@/data/privacy-policy";
import styles from "./PrivacyConsentCheckbox.module.css";

type PrivacyConsentCheckboxProps = {
  id: string;
  /** Posted as `name` = "on" when checked, so plain server-action forms work without JS state. */
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
};

/**
 * The one privacy-policy consent checkbox, used by every form that collects personal or business
 * details. Unchecked by default (callers start `checked` at false), required before submit (callers
 * validate on the client AND on the server). "מדיניות הפרטיות" opens the existing /privacy page in a
 * NEW tab (`noopener noreferrer`) so nothing already typed into the form is lost.
 *
 * The wording states that the data is stored and processed in line with the policy — it is not a
 * waiver, and it does not bundle marketing/newsletter consent (that would need its own checkbox).
 */
export function PrivacyConsentCheckbox({ id, name = "privacyConsent", checked, onChange, error, inputRef }: PrivacyConsentCheckboxProps) {
  const errorId = `${id}-error`;
  return (
    <div className={`${styles.field} ${error ? styles.invalid : ""}`}>
      <input
        id={id}
        ref={inputRef}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={styles.input}
      />
      <label htmlFor={id} className={styles.label}>
        אני מאשר/ת שקראתי את{" "}
        <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer" className={styles.link}>
          מדיניות הפרטיות
          <span className={styles.srOnly}> (נפתח בלשונית חדשה)</span>
        </a>{" "}
        ושאני מבין/ה שהמידע והנתונים שאמסור יישמרו ויעובדו במערכות הפורטל בהתאם למדיניות הפרטיות. *
      </label>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { trackAnalyticsEvent } from "@/repositories/analytics-service";
import { CONTACT_MESSAGE_SUBJECT_TYPE_LABEL, CONTACT_MESSAGE_SUBJECT_TYPE_OPTIONS } from "@/types/contact-message";
import { submitContactMessageAction, type ContactFormActionState } from "./actions";
import { EMPTY_CONTACT_FORM_VALUES, FIELD_ORDER, firstInvalidField, type ContactFormValues } from "./schema";
import styles from "./contact.module.css";

const INITIAL_STATE: ContactFormActionState = { status: "idle", values: EMPTY_CONTACT_FORM_VALUES };

const FIELD_LABELS: Record<keyof ContactFormValues, string> = {
  fullName: "שם מלא",
  email: "כתובת מייל",
  whatsapp: "מספר WhatsApp",
  subjectType: "נושא הפנייה",
  subject: "כותרת הפנייה",
  message: "תוכן ההודעה",
  consentAccepted: "אישור יצירת קשר",
  honeypot: "",
};

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function focusAndReveal(node: FieldElement | null | undefined) {
  if (!node) return;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  node.focus();
  node.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
}

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactMessageAction, INITIAL_STATE);
  const [values, setValues] = useState<ContactFormValues>(EMPTY_CONTACT_FORM_VALUES);

  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const subjectTypeRef = useRef<HTMLSelectElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<keyof ContactFormValues, RefObject<FieldElement | null>> = {
    fullName: fullNameRef,
    email: emailRef,
    whatsapp: whatsappRef,
    subjectType: subjectTypeRef,
    subject: subjectRef,
    message: messageRef,
    consentAccepted: consentRef,
    honeypot: honeypotRef,
  };

  const fullNameId = useId();
  const emailId = useId();
  const whatsappId = useId();
  const subjectTypeId = useId();
  const subjectId = useId();
  const messageId = useId();
  const consentId = useId();

  const fieldIds: Record<keyof ContactFormValues, string> = {
    fullName: fullNameId,
    email: emailId,
    whatsapp: whatsappId,
    subjectType: subjectTypeId,
    subject: subjectId,
    message: messageId,
    consentAccepted: consentId,
    honeypot: "",
  };

  // The server round-trip is the single source of truth for "what got submitted" — this is what
  // actually guarantees values survive a validation/server error. Adjusted during render (React's
  // documented pattern for state derived from a changed prop) rather than in an effect. Only plain
  // setState calls happen here — anything with a side effect (analytics) is deferred to the effect
  // below, since triggering another component's update (a server action call re-renders the router)
  // during this component's render is unsafe.
  const [previousState, setPreviousState] = useState(state);
  if (previousState !== state) {
    setPreviousState(state);
    if (state.status !== "idle" && state.status !== "success") {
      setValues(state.values);
    } else if (state.status === "success") {
      setValues(EMPTY_CONTACT_FORM_VALUES);
    }
  }

  // Fires the outcome analytics event once per state transition (not on every render) — a plain
  // effect, not the render-time block above, since trackAnalyticsEvent (a server action) must never
  // be invoked while React is still rendering this component.
  useEffect(() => {
    if (state.status === "success") {
      void trackAnalyticsEvent("contact-form-success", { metadata: { sourcePage: "/contact" } });
    } else if (state.status === "validation-error" || state.status === "server-error" || state.status === "rate-limited") {
      void trackAnalyticsEvent("contact-form-error", { metadata: { sourcePage: "/contact" } });
    }
  }, [state]);

  // Focus (and reveal) the first invalid field after a failed submit.
  useEffect(() => {
    if (state.status !== "validation-error") return;
    const field = firstInvalidField(state.fieldErrors);
    if (!field) return;
    focusAndReveal(fieldRefs[field].current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fieldRefs holds stable ref objects; only `state` should retrigger this
  }, [state]);

  function updateField<Field extends keyof ContactFormValues>(field: Field) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  function fieldError(field: keyof ContactFormValues): string | undefined {
    return state.status === "validation-error" ? state.fieldErrors?.[field]?.[0] : undefined;
  }

  function handleSubmit() {
    // Fires alongside the form's native `action` submission — never blocks or delays it.
    void trackAnalyticsEvent("contact-form-submit", { metadata: { sourcePage: "/contact" } });
  }

  if (state.status === "success") {
    return (
      <div className={styles.successBox} role="status" aria-live="polite">
        <p className={styles.successTitle}>הפנייה נשלחה בהצלחה</p>
        <p className={styles.successDetail}>קיבלנו את ההודעה ונחזור אליכם במייל או ב־WhatsApp.</p>
      </div>
    );
  }

  const invalidFields = state.status === "validation-error" ? FIELD_ORDER.filter((field) => fieldError(field)) : [];

  return (
    <form action={formAction} onSubmit={handleSubmit} className={styles.form} noValidate>
      <h2 className={styles.formTitle}>טופס יצירת קשר</h2>

      {(state.status === "server-error" || state.status === "rate-limited") && state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      {state.status === "validation-error" && invalidFields.length > 0 && (
        <div className={styles.summary} role="alert" aria-live="assertive">
          <p className={styles.summaryTitle}>יש כמה פרטים שצריך לתקן</p>
          <p className={styles.summaryDescription}>כל מה שמילאתם נשמר. עברו על השדות המסומנים.</p>
          <ul className={styles.summaryList}>
            {invalidFields.map((field) => (
              <li key={field}>
                <a
                  href={`#${fieldIds[field]}`}
                  onClick={(event) => {
                    event.preventDefault();
                    focusAndReveal(fieldRefs[field].current);
                  }}
                >
                  {FIELD_LABELS[field]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`${styles.field} ${fieldError("fullName") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={fullNameId}>שם מלא *</label>
        <input
          id={fullNameId}
          ref={fullNameRef}
          name="fullName"
          type="text"
          maxLength={120}
          autoComplete="name"
          value={values.fullName}
          onChange={updateField("fullName")}
          aria-invalid={Boolean(fieldError("fullName"))}
          aria-describedby={fieldError("fullName") ? `${fullNameId}-error` : undefined}
        />
        {fieldError("fullName") && (
          <p id={`${fullNameId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("fullName")}
          </p>
        )}
      </div>

      <div className={styles.row}>
        <div className={`${styles.field} ${fieldError("email") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={emailId}>כתובת מייל *</label>
          <input
            id={emailId}
            ref={emailRef}
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            value={values.email}
            onChange={updateField("email")}
            aria-invalid={Boolean(fieldError("email"))}
            aria-describedby={fieldError("email") ? `${emailId}-error` : undefined}
          />
          {fieldError("email") && (
            <p id={`${emailId}-error`} className={styles.fieldErrorMessage} role="alert">
              {fieldError("email")}
            </p>
          )}
        </div>

        <div className={`${styles.field} ${fieldError("whatsapp") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={whatsappId}>מספר WhatsApp</label>
          <input
            id={whatsappId}
            ref={whatsappRef}
            name="whatsapp"
            type="tel"
            dir="ltr"
            placeholder="054-521-8644"
            value={values.whatsapp}
            onChange={updateField("whatsapp")}
            aria-invalid={Boolean(fieldError("whatsapp"))}
            aria-describedby={fieldError("whatsapp") ? `${whatsappId}-error` : `${whatsappId}-hint`}
          />
          {fieldError("whatsapp") ? (
            <p id={`${whatsappId}-error`} className={styles.fieldErrorMessage} role="alert">
              {fieldError("whatsapp")}
            </p>
          ) : (
            <p id={`${whatsappId}-hint`} className={styles.fieldHint}>
              אם תרצו שנחזור אליכם ב־WhatsApp.
            </p>
          )}
        </div>
      </div>

      <div className={`${styles.field} ${fieldError("subjectType") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={subjectTypeId}>נושא הפנייה *</label>
        <select
          id={subjectTypeId}
          ref={subjectTypeRef}
          name="subjectType"
          autoComplete="off"
          value={values.subjectType}
          onChange={updateField("subjectType")}
          aria-invalid={Boolean(fieldError("subjectType"))}
          aria-describedby={fieldError("subjectType") ? `${subjectTypeId}-error` : undefined}
        >
          <option value="" disabled>
            בחרו נושא
          </option>
          {CONTACT_MESSAGE_SUBJECT_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {CONTACT_MESSAGE_SUBJECT_TYPE_LABEL[option]}
            </option>
          ))}
        </select>
        {fieldError("subjectType") && (
          <p id={`${subjectTypeId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("subjectType")}
          </p>
        )}
      </div>

      <div className={`${styles.field} ${fieldError("subject") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={subjectId}>כותרת הפנייה *</label>
        <input
          id={subjectId}
          ref={subjectRef}
          name="subject"
          type="text"
          maxLength={140}
          value={values.subject}
          onChange={updateField("subject")}
          aria-invalid={Boolean(fieldError("subject"))}
          aria-describedby={fieldError("subject") ? `${subjectId}-error` : undefined}
        />
        {fieldError("subject") && (
          <p id={`${subjectId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("subject")}
          </p>
        )}
      </div>

      <div className={`${styles.field} ${fieldError("message") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={messageId}>איך אפשר לעזור? *</label>
        <textarea
          id={messageId}
          ref={messageRef}
          name="message"
          rows={6}
          maxLength={3000}
          value={values.message}
          onChange={updateField("message")}
          aria-invalid={Boolean(fieldError("message"))}
          aria-describedby={fieldError("message") ? `${messageId}-error` : undefined}
        />
        {fieldError("message") && (
          <p id={`${messageId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("message")}
          </p>
        )}
      </div>

      <div className={`${styles.consentField} ${fieldError("consentAccepted") ? styles.fieldInvalid : ""}`}>
        <input
          id={consentId}
          ref={consentRef}
          name="consentAccepted"
          type="checkbox"
          checked={values.consentAccepted}
          onChange={(event) => setValues((current) => ({ ...current, consentAccepted: event.target.checked }))}
          aria-invalid={Boolean(fieldError("consentAccepted"))}
          aria-describedby={fieldError("consentAccepted") ? `${consentId}-error` : undefined}
        />
        <label htmlFor={consentId}>אני מאשר/ת שניתן ליצור איתי קשר במייל או ב־WhatsApp לצורך טיפול בפנייה. *</label>
        {fieldError("consentAccepted") && (
          <p id={`${consentId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("consentAccepted")}
          </p>
        )}
      </div>

      {/* Honeypot — hidden from real visitors via CSS, never via type="hidden" (some bots skip those). */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">אתר אינטרנט</label>
        <input id="website" ref={honeypotRef} name="honeypot" type="text" tabIndex={-1} autoComplete="off" value={values.honeypot} onChange={updateField("honeypot")} />
      </div>

      <Button type="submit" variant="accent" fullWidth disabled={isPending}>
        {isPending ? "שולחים את הפנייה…" : "שליחת הפנייה"}
      </Button>
    </form>
  );
}

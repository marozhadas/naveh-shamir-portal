"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { registerBusinessAction, type BusinessRegistrationActionState } from "./actions";
import { getVisibleBusinessCategories } from "@/data/business-categories";
import { EMPTY_FORM_VALUES, FIELD_ORDER, firstInvalidField, type BusinessRegistrationFormValues } from "./schema";
import styles from "./register.module.css";

const CATEGORIES = getVisibleBusinessCategories();
// Lives here, not in actions.ts: a "use server" file may only export async functions — exporting a
// plain constant from one breaks static prerendering ("Server Functions cannot be called during
// initial render"), which is exactly what happened when this was tried there.
const INITIAL_STATE: BusinessRegistrationActionState = { status: "idle", values: EMPTY_FORM_VALUES };
const DRAFT_STORAGE_KEY = "naveh-shamir-business-registration-draft-v1";
const DRAFT_SAVE_DELAY_MS = 700;

const FIELD_LABELS: Record<keyof BusinessRegistrationFormValues, string> = {
  businessName: "שם העסק",
  categoryId: "קטגוריה",
  shortDescription: "תיאור קצר",
  description: "תיאור מלא",
  contactName: "שם איש/אשת קשר",
  phone: "טלפון",
  whatsappPhone: "וואטסאפ",
  email: "אימייל",
  websiteUrl: "אתר אינטרנט",
  address: "כתובת",
  serviceArea: "אזור שירות",
};

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function focusAndReveal(node: FieldElement | null | undefined) {
  if (!node) return;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  node.focus();
  node.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
}

type RegisterBusinessFormProps = {
  /** Defaults to the free-plan action — Plus/Premium pages pass their own tier-tagged action. */
  action?: typeof registerBusinessAction;
  /** Extra plan-context content rendered above the fields (e.g. a Plus/Premium plan summary). */
  planIntro?: ReactNode;
};

export function RegisterBusinessForm({ action = registerBusinessAction, planIntro }: RegisterBusinessFormProps = {}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const [values, setValues] = useState<BusinessRegistrationFormValues>(EMPTY_FORM_VALUES);
  const [draftRestored, setDraftRestored] = useState(false);
  const hasLoadedDraftRef = useRef(false);

  const businessNameRef = useRef<HTMLInputElement>(null);
  const categoryIdRef = useRef<HTMLSelectElement>(null);
  const shortDescriptionRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const contactNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const whatsappPhoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const websiteUrlRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const serviceAreaRef = useRef<HTMLInputElement>(null);

  // References the stable refs above — built fresh each render, but every value inside it is the
  // same ref object every time, so this is just a lookup table, not something that creates or
  // writes refs during render.
  const fieldRefs: Record<keyof BusinessRegistrationFormValues, RefObject<FieldElement | null>> = {
    businessName: businessNameRef,
    categoryId: categoryIdRef,
    shortDescription: shortDescriptionRef,
    description: descriptionRef,
    contactName: contactNameRef,
    phone: phoneRef,
    whatsappPhone: whatsappPhoneRef,
    email: emailRef,
    websiteUrl: websiteUrlRef,
    address: addressRef,
    serviceArea: serviceAreaRef,
  };

  const nameId = useId();
  const categoryFieldId = useId();
  const shortId = useId();
  const descriptionId = useId();
  const contactId = useId();
  const phoneId = useId();
  const whatsappId = useId();
  const emailId = useId();
  const websiteId = useId();
  const addressId = useId();
  const areaId = useId();

  const fieldIds: Record<keyof BusinessRegistrationFormValues, string> = {
    businessName: nameId,
    categoryId: categoryFieldId,
    shortDescription: shortId,
    description: descriptionId,
    contactName: contactId,
    phone: phoneId,
    whatsappPhone: whatsappId,
    email: emailId,
    websiteUrl: websiteId,
    address: addressId,
    serviceArea: areaId,
  };

  // Restore a locally-saved draft once, before the user has submitted anything this visit. Reading
  // sessionStorage is an external-system read that can only happen client-side, so this genuinely
  // belongs in an effect (unlike the render-time adjustment below, which reacts to a value already
  // available during render).
  useEffect(() => {
    if (hasLoadedDraftRef.current) return;
    hasLoadedDraftRef.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<BusinessRegistrationFormValues>;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from sessionStorage on mount, not a prop/state sync
      setValues((current) => ({ ...current, ...parsed }));
      setDraftRestored(true);
    } catch {
      // Corrupt or unavailable storage — just start with an empty form.
    }
  }, []);

  // The server round-trip is the single source of truth for "what got submitted" — this is what
  // actually guarantees values survive a validation/server error, regardless of anything else.
  // Adjusted during render (React's documented pattern for "state derived from a changed value",
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // rather than in an effect, to avoid an extra render pass.
  const [previousState, setPreviousState] = useState(state);
  if (previousState !== state) {
    setPreviousState(state);
    if (state.status !== "idle") {
      setValues(state.values);
    }
  }

  // Belt-and-suspenders: browsers restore a <select>'s prior selection on their own when a page is
  // revisited (independent of React), which can leave React's "last value I wrote" tracking stale
  // and cause it to skip re-applying the correct value after a round-trip. `autoComplete="off"` on
  // the form (below) addresses the root cause; this re-asserts the DOM value on every render as a
  // guarantee regardless of cause. Writing to the ref directly (no setState) can't cause a loop.
  useEffect(() => {
    if (categoryIdRef.current && categoryIdRef.current.value !== values.categoryId) {
      categoryIdRef.current.value = values.categoryId;
    }
  });

  // Debounced local draft save — skipped once the registration has actually gone through.
  useEffect(() => {
    if (state.status === "success") return;
    const timeout = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
      } catch {
        // Storage full/unavailable — this is a convenience feature, not worth surfacing an error for.
      }
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [values, state.status]);

  useEffect(() => {
    if (state.status !== "success") return;
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Nothing to do if storage is unavailable.
    }
  }, [state.status]);

  // Focus (and reveal) the first invalid field after a failed submit — the error summary above it
  // is announced via role="alert" regardless of where focus lands.
  useEffect(() => {
    if (state.status !== "validation-error") return;
    const field = firstInvalidField(state.fieldErrors);
    if (!field) return;
    focusAndReveal(fieldRefs[field].current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fieldRefs holds stable ref objects; only `state` should retrigger this
  }, [state]);

  function updateField<Field extends keyof BusinessRegistrationFormValues>(field: Field) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  function fieldError(field: keyof BusinessRegistrationFormValues): string | undefined {
    return state.status === "validation-error" ? state.fieldErrors?.[field]?.[0] : undefined;
  }

  if (state.status === "success") {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>ההרשמה נשלחה בהצלחה!</p>
        <p className={styles.successDetail}>
          הפרטים ממתינים לבדיקה ואישור של צוות הפורטל. לאחר האישור העסק שלכם יופיע בארכיון העסקים.
        </p>
      </div>
    );
  }

  const invalidFields = state.status === "validation-error" ? FIELD_ORDER.filter((field) => fieldError(field)) : [];

  return (
    <form action={formAction} className={styles.form} noValidate>
      {planIntro}
      {draftRestored && state.status === "idle" && <p className={styles.draftNotice}>שחזרנו את הפרטים שמילאת.</p>}

      {state.status === "server-error" && state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      {state.status === "validation-error" && invalidFields.length > 0 && (
        <div className={styles.summary} role="alert" aria-live="assertive">
          <p className={styles.summaryTitle}>יש כמה פרטים שצריך לתקן</p>
          <p className={styles.summaryDescription}>הפרטים שמילאת נשמרו. עברו על השדות המסומנים והשלימו את החסר.</p>
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

      <div className={`${styles.field} ${fieldError("businessName") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={nameId}>שם העסק *</label>
        <input
          id={nameId}
          ref={businessNameRef}
          name="businessName"
          type="text"
          maxLength={120}
          value={values.businessName}
          onChange={updateField("businessName")}
          aria-invalid={Boolean(fieldError("businessName"))}
          aria-describedby={fieldError("businessName") ? `${nameId}-error` : undefined}
        />
        {fieldError("businessName") && (
          <p id={`${nameId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("businessName")}
          </p>
        )}
      </div>

      <div className={`${styles.field} ${fieldError("categoryId") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={categoryFieldId}>קטגוריה *</label>
        <select
          id={categoryFieldId}
          ref={categoryIdRef}
          name="categoryId"
          autoComplete="off"
          value={values.categoryId}
          onChange={updateField("categoryId")}
          aria-invalid={Boolean(fieldError("categoryId"))}
          aria-describedby={fieldError("categoryId") ? `${categoryFieldId}-error` : undefined}
        >
          <option value="" disabled>
            בחרו קטגוריה
          </option>
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        {fieldError("categoryId") && (
          <p id={`${categoryFieldId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("categoryId")}
          </p>
        )}
      </div>

      <div className={`${styles.field} ${fieldError("shortDescription") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={shortId}>תיאור קצר</label>
        <input
          id={shortId}
          ref={shortDescriptionRef}
          name="shortDescription"
          type="text"
          maxLength={140}
          placeholder="משפט אחד שמסביר מה העסק עושה"
          value={values.shortDescription}
          onChange={updateField("shortDescription")}
          aria-invalid={Boolean(fieldError("shortDescription"))}
          aria-describedby={fieldError("shortDescription") ? `${shortId}-error` : undefined}
        />
        {fieldError("shortDescription") && (
          <p id={`${shortId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("shortDescription")}
          </p>
        )}
      </div>

      <div className={`${styles.field} ${fieldError("description") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={descriptionId}>תיאור מלא *</label>
        <textarea
          id={descriptionId}
          ref={descriptionRef}
          name="description"
          rows={5}
          maxLength={800}
          value={values.description}
          onChange={updateField("description")}
          aria-invalid={Boolean(fieldError("description"))}
          aria-describedby={fieldError("description") ? `${descriptionId}-error` : undefined}
        />
        {fieldError("description") && (
          <p id={`${descriptionId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("description")}
          </p>
        )}
      </div>

      <div className={`${styles.field} ${fieldError("contactName") ? styles.fieldInvalid : ""}`}>
        <label htmlFor={contactId}>שם איש/אשת קשר *</label>
        <input
          id={contactId}
          ref={contactNameRef}
          name="contactName"
          type="text"
          maxLength={120}
          value={values.contactName}
          onChange={updateField("contactName")}
          aria-invalid={Boolean(fieldError("contactName"))}
          aria-describedby={fieldError("contactName") ? `${contactId}-error` : undefined}
        />
        {fieldError("contactName") && (
          <p id={`${contactId}-error`} className={styles.fieldErrorMessage} role="alert">
            {fieldError("contactName")}
          </p>
        )}
      </div>

      <div className={styles.row}>
        <div className={`${styles.field} ${fieldError("phone") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={phoneId}>טלפון</label>
          <input
            id={phoneId}
            ref={phoneRef}
            name="phone"
            type="tel"
            dir="ltr"
            placeholder="+972500000000"
            value={values.phone}
            onChange={updateField("phone")}
            aria-invalid={Boolean(fieldError("phone"))}
            aria-describedby={fieldError("phone") ? `${phoneId}-error` : undefined}
          />
          {fieldError("phone") && (
            <p id={`${phoneId}-error`} className={styles.fieldErrorMessage} role="alert">
              {fieldError("phone")}
            </p>
          )}
        </div>
        <div className={`${styles.field} ${fieldError("whatsappPhone") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={whatsappId}>וואטסאפ</label>
          <input
            id={whatsappId}
            ref={whatsappPhoneRef}
            name="whatsappPhone"
            type="tel"
            dir="ltr"
            placeholder="+972500000000"
            value={values.whatsappPhone}
            onChange={updateField("whatsappPhone")}
            aria-invalid={Boolean(fieldError("whatsappPhone"))}
            aria-describedby={fieldError("whatsappPhone") ? `${whatsappId}-error` : undefined}
          />
          {fieldError("whatsappPhone") && (
            <p id={`${whatsappId}-error`} className={styles.fieldErrorMessage} role="alert">
              {fieldError("whatsappPhone")}
            </p>
          )}
        </div>
      </div>

      <div className={styles.row}>
        <div className={`${styles.field} ${fieldError("email") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={emailId}>אימייל</label>
          <input
            id={emailId}
            ref={emailRef}
            name="email"
            type="email"
            dir="ltr"
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
        <div className={`${styles.field} ${fieldError("websiteUrl") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={websiteId}>אתר אינטרנט</label>
          <input
            id={websiteId}
            ref={websiteUrlRef}
            name="websiteUrl"
            type="text"
            dir="ltr"
            placeholder="https://..."
            value={values.websiteUrl}
            onChange={updateField("websiteUrl")}
            aria-invalid={Boolean(fieldError("websiteUrl"))}
            aria-describedby={fieldError("websiteUrl") ? `${websiteId}-error` : undefined}
          />
          {fieldError("websiteUrl") && (
            <p id={`${websiteId}-error`} className={styles.fieldErrorMessage} role="alert">
              {fieldError("websiteUrl")}
            </p>
          )}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={addressId}>כתובת</label>
          <input
            id={addressId}
            ref={addressRef}
            name="address"
            type="text"
            value={values.address}
            onChange={updateField("address")}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={areaId}>אזור שירות</label>
          <input
            id={areaId}
            ref={serviceAreaRef}
            name="serviceArea"
            type="text"
            value={values.serviceArea}
            onChange={updateField("serviceArea")}
          />
        </div>
      </div>

      <p className={styles.hint}>יש להזין לפחות דרך התקשרות אחת (טלפון, וואטסאפ או אימייל).</p>

      <Button type="submit" variant="accent" disabled={isPending}>
        {isPending ? "שולח…" : "שליחת הרשמה"}
      </Button>
    </form>
  );
}

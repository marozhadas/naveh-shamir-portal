"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { submitFeedbackAction, type FeedbackState } from "./feedback-actions";
import { FEEDBACK_KINDS, FEEDBACK_KIND_LABEL, MAX_FEEDBACK_LENGTH } from "./feedback-schema";
import styles from "./FeedbackWidget.module.css";

const INITIAL_STATE: FeedbackState = { status: "idle" };

function FeedbackForm({ pagePath, onClose, firstFieldRef }: { pagePath: string; onClose: () => void; firstFieldRef: React.RefObject<HTMLSelectElement | null> }) {
  const [state, formAction, isPending] = useActionState(submitFeedbackAction, INITIAL_STATE);
  const [length, setLength] = useState(0);
  const ids = useId();

  if (state.status === "success") {
    return (
      <div className={styles.success} role="status">
        <p>תודה! המשוב נשלח לצוות הפורטל.</p>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          סגירה
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${ids}-website`}>אתר</label>
        <input id={`${ids}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="pagePath" value={pagePath} />

      <div className={styles.field}>
        <label htmlFor={`${ids}-kind`}>סוג המשוב</label>
        <select id={`${ids}-kind`} name="kind" defaultValue="idea" ref={firstFieldRef}>
          {FEEDBACK_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {FEEDBACK_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${ids}-message`}>מה תרצו לספר לנו?</label>
        <textarea
          id={`${ids}-message`}
          name="message"
          rows={4}
          required
          maxLength={MAX_FEEDBACK_LENGTH}
          onChange={(event) => setLength(event.target.value.length)}
          aria-invalid={Boolean(state.fieldErrors?.message)}
          aria-describedby={`${ids}-message-hint`}
        />
        <p id={`${ids}-message-hint`} className={styles.hint}>
          {length} / {MAX_FEEDBACK_LENGTH} תווים
        </p>
        {state.fieldErrors?.message?.map((error) => (
          <p key={error} className={styles.error} role="alert">
            {error}
          </p>
        ))}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${ids}-name`}>שם (לא חובה)</label>
        <input id={`${ids}-name`} name="name" type="text" maxLength={120} autoComplete="name" />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${ids}-email`}>מייל למענה (לא חובה)</label>
        <input id={`${ids}-email`} name="email" type="email" dir="ltr" maxLength={200} autoComplete="email" aria-invalid={Boolean(state.fieldErrors?.email)} />
        {state.fieldErrors?.email?.map((error) => (
          <p key={error} className={styles.error} role="alert">
            {error}
          </p>
        ))}
      </div>

      <p className={styles.hint}>בשליחה המשוב מועבר לצוות הפורטל.</p>

      {state.status === "error" && !state.fieldErrors && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <button type="submit" className={styles.submitButton} disabled={isPending}>
        {isPending ? "שולח…" : "שליחת משוב"}
      </button>
    </form>
  );
}

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open, formKey]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  function close() {
    setOpen(false);
    setFormKey((key) => key + 1);
    triggerRef.current?.focus();
  }

  const onBusinessPage = pathname.startsWith("/businesses/");

  return (
    <div className={`${styles.root} ${onBusinessPage ? styles.aboveMobileBar : ""}`}>
      {open && (
        <div id={panelId} role="dialog" aria-labelledby={titleId} className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 id={titleId} className={styles.title}>
              משוב על האתר
            </h2>
            <button type="button" className={styles.closeButton} onClick={close} aria-label="סגירת חלון המשוב">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <FeedbackForm key={formKey} pagePath={pathname} onClose={close} firstFieldRef={firstFieldRef} />
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <MessageSquarePlus size={18} aria-hidden="true" />
        <span>משוב</span>
      </button>
    </div>
  );
}

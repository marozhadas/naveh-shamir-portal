"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { saveSumitPaymentMethodForRegistrationAction } from "@/app/business/dashboard/sumit-payment-actions";
import { CardTrustBadges } from "../PaymentMethodTrialForm/CardTrustBadges";
import { COMMUNICATION_ERROR_MESSAGE, validatePayer, type PayerFieldErrors } from "../PaymentMethodTrialForm/tokenize-payer";
import { normalizeCard, requestToken, type CardFieldErrors, type PaymentsJsGlobal } from "@/lib/sumit/payments-js";
import { CARD_FORM_CONSENT, CARD_FORM_LEAD, CARD_FORM_SECURITY_NOTE, CARD_FORM_SUBMIT } from "@/lib/sumit/registration-copy";
import { ensurePaymentsJs } from "./load-payments-js";
import styles from "../PaymentMethodTrialForm/PaymentMethodTrialForm.module.css";

const FORM_ID = "sumit-card-form";
const REFUSED_MESSAGE = "פרטי הכרטיס לא התקבלו. בדקו את מספר הכרטיס, התוקף וה-CVV ונסו שוב. לא בוצע חיוב.";
const RE_ENTER_MESSAGE = " הזינו שוב את פרטי הכרטיס.";
const SCRIPT_ERROR_MESSAGE = "לא הצלחנו לטעון את טופס התשלום המאובטח. רעננו את העמוד ונסו שוב.";

type SumitCardFormProps = {
  /** The CompanyID and the PUBLIC key payments.js needs - handed over by the server to the signed-in, allow-listed owner only. */
  companyId: number;
  apiPublicKey: string;
  /** The pending registration whose card is being saved (the server checks it belongs to the signed-in owner). */
  registrationId: string;
  onCompleted: () => void;
};

type CardRefs = { number: HTMLInputElement | null; month: HTMLInputElement | null; year: HTMLInputElement | null; cvv: HTMLInputElement | null };

/**
 * Step 6 of the registration (SUMIT experiment): SAVE A CARD. Nothing is charged, no subscription or trial is created.
 *
 * Unlike PayMe's Hosted Fields (iframes), SUMIT's payments.js reads the card from ordinary inputs on THIS page and posts it
 * straight to SUMIT. So the card lives in the DOM for a moment, and this form therefore:
 *   - keeps the card in UNCONTROLLED inputs (no React state, no props, no logging) and clears them as soon as a token exists;
 *   - never lets the form submit natively, and calls payments.js once per click under its own lock (payments.js has no guard);
 *   - sends our server action ONLY the registration id, SUMIT's one-time token, the payer's name / email / phone and the consent -
 *     never a card number, expiry, CVV or ID number (the action refuses anything else);
 *   - never shows SUMIT's own message text, and has its own timeout (payments.js is silent when the request cannot be sent).
 */
export function SumitCardForm({ companyId, apiPublicKey, registrationId, onCompleted }: SumitCardFormProps) {
  const paymentsRef = useRef<PaymentsJsGlobal | null>(null);
  const busyRef = useRef(false);
  const cardRefs = useRef<CardRefs>({ number: null, month: null, year: null, cvv: null });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [payer, setPayer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [payerErrors, setPayerErrors] = useState<PayerFieldErrors>({});
  const [cardErrors, setCardErrors] = useState<CardFieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    ensurePaymentsJs({
      win: window as never,
      doc: document as never,
      importJquery: () => import("jquery"),
    }).then(
      (payments) => {
        if (cancelled) return;
        paymentsRef.current = payments;
        setReady(true);
      },
      () => {
        if (!cancelled) setLoadError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const clearCard = useCallback(() => {
    for (const input of Object.values(cardRefs.current)) if (input) input.value = "";
  }, []);

  const handleSubmit = useCallback(async () => {
    if (busyRef.current) return; // one attempt at a time: a double click must never start two tokenizations
    setError(null);
    if (!consent) {
      setError("יש לאשר את שמירת אמצעי התשלום כדי להמשיך.");
      return;
    }
    const payerProblems = validatePayer(payer);
    setPayerErrors(payerProblems);
    const refs = cardRefs.current;
    const card = normalizeCard({ number: refs.number?.value ?? "", month: refs.month?.value ?? "", year: refs.year?.value ?? "", cvv: refs.cvv?.value ?? "" });
    setCardErrors(card.ok ? {} : card.errors);
    if (Object.keys(payerProblems).length > 0 || !card.ok) return;

    busyRef.current = true;
    setBusy(true);
    try {
      // payments.js reads the inputs themselves: hand it the normalized values (digits only, 4-digit year)
      if (refs.number) refs.number.value = card.card.number;
      if (refs.month) refs.month.value = card.card.month;
      if (refs.year) refs.year.value = card.card.year;
      if (refs.cvv) refs.cvv.value = card.card.cvv;

      const attempt = await requestToken({
        payments: paymentsRef.current ?? undefined,
        companyId,
        apiPublicKey,
        form: { querySelector: (selector) => document.querySelector<HTMLInputElement>(`#${FORM_ID} ${selector}`) },
        formSelector: `#${FORM_ID}`,
      });
      if (attempt.status === "refused") {
        setError(REFUSED_MESSAGE);
        return;
      }
      if (attempt.status !== "ok") {
        setError(COMMUNICATION_ERROR_MESSAGE);
        return;
      }

      // the token exists: the card is no longer needed on the page
      clearCard();
      const outcome = await saveSumitPaymentMethodForRegistrationAction({
        registrationId,
        token: attempt.token,
        payer: { firstName: payer.firstName, lastName: payer.lastName, email: payer.email, phone: payer.phone },
        consent,
      });
      if (outcome.status === "success") {
        onCompleted();
        return;
      }
      setError(`${outcome.message ?? "אירעה תקלה. לא בוצע חיוב."}${RE_ENTER_MESSAGE}`);
    } catch {
      // a real communication / server failure of the server action (tokenization problems are handled above)
      clearCard();
      setError(`${COMMUNICATION_ERROR_MESSAGE}${RE_ENTER_MESSAGE}`);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [apiPublicKey, clearCard, companyId, consent, onCompleted, payer, registrationId]);

  if (loadError) {
    return (
      <p className={styles.error} role="alert">
        {SCRIPT_ERROR_MESSAGE}
      </p>
    );
  }

  return (
    <form
      id={FORM_ID}
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        // never a native submit (Enter inside a field included): the click handler is the only way to start an attempt
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <p className={styles.lead}>{CARD_FORM_LEAD}</p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="sumit-fn">שם פרטי *</label>
          <input id="sumit-fn" autoComplete="given-name" required aria-required="true" aria-invalid={Boolean(payerErrors.firstName)} value={payer.firstName} onChange={(e) => setPayer((p) => ({ ...p, firstName: e.target.value }))} />
          {payerErrors.firstName && <p className={styles.fieldError}>{payerErrors.firstName}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="sumit-ln">שם משפחה *</label>
          <input id="sumit-ln" autoComplete="family-name" required aria-required="true" aria-invalid={Boolean(payerErrors.lastName)} value={payer.lastName} onChange={(e) => setPayer((p) => ({ ...p, lastName: e.target.value }))} />
          {payerErrors.lastName && <p className={styles.fieldError}>{payerErrors.lastName}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="sumit-em">אימייל *</label>
          <input id="sumit-em" type="email" dir="ltr" autoComplete="email" required aria-required="true" aria-invalid={Boolean(payerErrors.email)} value={payer.email} onChange={(e) => setPayer((p) => ({ ...p, email: e.target.value }))} />
          {payerErrors.email && <p className={styles.fieldError}>{payerErrors.email}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="sumit-ph">טלפון *</label>
          <input id="sumit-ph" type="tel" dir="ltr" autoComplete="tel" inputMode="tel" required aria-required="true" aria-invalid={Boolean(payerErrors.phone)} value={payer.phone} onChange={(e) => setPayer((p) => ({ ...p, phone: e.target.value }))} />
          {payerErrors.phone && <p className={styles.fieldError}>{payerErrors.phone}</p>}
        </div>
      </div>

      <div className={styles.cardBox} aria-busy={!ready}>
        <div className={styles.field}>
          <label htmlFor="sumit-card-number">מספר כרטיס</label>
          <input id="sumit-card-number" data-og="cardnumber" ref={(node) => { cardRefs.current.number = node; }} dir="ltr" inputMode="numeric" autoComplete="cc-number" maxLength={23} aria-invalid={Boolean(cardErrors.number)} />
          {cardErrors.number && <p className={styles.fieldError}>{cardErrors.number}</p>}
        </div>
        <div className={styles.cardRow}>
          <div className={styles.field}>
            <label htmlFor="sumit-card-month">חודש (MM)</label>
            <input id="sumit-card-month" data-og="expirationmonth" ref={(node) => { cardRefs.current.month = node; }} dir="ltr" inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} aria-invalid={Boolean(cardErrors.month)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="sumit-card-year">שנה (YY או YYYY)</label>
            <input id="sumit-card-year" data-og="expirationyear" ref={(node) => { cardRefs.current.year = node; }} dir="ltr" inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} aria-invalid={Boolean(cardErrors.month)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="sumit-card-cvv">CVV</label>
            <input id="sumit-card-cvv" data-og="cvv" ref={(node) => { cardRefs.current.cvv = node; }} dir="ltr" inputMode="numeric" autoComplete="cc-csc" maxLength={4} aria-invalid={Boolean(cardErrors.cvv)} />
            {cardErrors.cvv && <p className={styles.fieldError}>{cardErrors.cvv}</p>}
          </div>
        </div>
        {cardErrors.month && <p className={styles.fieldError}>{cardErrors.month}</p>}
        <p className={styles.secure}>{CARD_FORM_SECURITY_NOTE}</p>
        <CardTrustBadges />
      </div>

      <label className={styles.consent}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{CARD_FORM_CONSENT}</span>
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button type="button" variant="accent" fullWidth disabled={!ready || busy} onClick={() => void handleSubmit()}>
        {busy ? "שומרים…" : CARD_FORM_SUBMIT}
      </Button>
    </form>
  );
}

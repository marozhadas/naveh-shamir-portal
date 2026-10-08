"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { activateTrialWithPaymentMethodAction } from "@/app/business/dashboard/payment-actions";
import styles from "./PaymentMethodTrialForm.module.css";

/** The slice of PayMe's Hosted Fields (JSAPI) this form uses — https://github.com/PayMeService/payme-jsapi */
type PayMeHostedField = { mount: (selector: string) => Promise<unknown> };
type PayMeInstance = {
  hostedFields: () => { create: (type: string, options?: Record<string, unknown>) => PayMeHostedField };
  tokenize: (saleData: Record<string, unknown>) => Promise<{
    type?: string;
    token?: string;
    card?: { cardMask?: string };
    errors?: Record<string, { message?: string } | string>;
    message?: string;
    statusCode?: number;
  }>;
  teardown?: () => void;
};
type PayMeGlobal = {
  create: (apiKey: string, options: Record<string, unknown>) => Promise<PayMeInstance>;
  fields: { NUMBER: string; EXPIRATION: string; CVC: string };
};
declare global {
  interface Window {
    PayMe?: PayMeGlobal;
  }
}

const HOSTED_FIELDS_SCRIPT = "https://cdn.payme.io/hf/v1/hostedfields.js";

function loadHostedFieldsScript(): Promise<void> {
  if (window.PayMe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${HOSTED_FIELDS_SCRIPT}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("script-load-failed")), { once: true });
    if (!existing) {
      script.src = HOSTED_FIELDS_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

type PaymentMethodTrialFormProps = {
  /** The key PayMe's Hosted Fields is initialised with — passed by the server only to the signed-in owner of an eligible business. */
  hostedFieldsKey: string;
  testMode: boolean;
  trialDays: number;
  planName: string;
  /** e.g. "49 ₪ לחודש" — display only; the server decides the real price from the stored plan + interval. */
  priceLabel: string;
  amountValue: string;
};

/**
 * Card entry for starting the trial. Card number, expiry and CVV live inside PayMe's own Hosted Fields iframes:
 * they never touch our page's DOM, our JavaScript or our server. Only PayMe's opaque token (+ the masked card)
 * is sent to our server action, which validates everything again.
 */
export function PaymentMethodTrialForm({ hostedFieldsKey, testMode, trialDays, planName, priceLabel, amountValue }: PaymentMethodTrialFormProps) {
  const router = useRouter();
  const uid = useId();
  const instanceRef = useRef<PayMeInstance | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [payer, setPayer] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadHostedFieldsScript();
        if (cancelled || !window.PayMe) return;
        const instance = await window.PayMe.create(hostedFieldsKey, { testMode, language: "he", tokenIsPermanent: true });
        if (cancelled) return;
        const fields = instance.hostedFields();
        const style = { base: { "font-size": "16px", color: "#1e3857" }, invalid: { color: "#b3261e" } };
        const number = fields.create(window.PayMe.fields.NUMBER, { placeholder: "מספר כרטיס", styles: style });
        const expiration = fields.create(window.PayMe.fields.EXPIRATION, { placeholder: "MM/YY", styles: style });
        const cvc = fields.create(window.PayMe.fields.CVC, { placeholder: "CVV", styles: style });
        await Promise.all([number.mount(`#${CSS.escape(uid)}-number`), expiration.mount(`#${CSS.escape(uid)}-expiry`), cvc.mount(`#${CSS.escape(uid)}-cvc`)]);
        if (cancelled) return;
        instanceRef.current = instance;
        setReady(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
      instanceRef.current?.teardown?.();
      instanceRef.current = null;
      // A new PayMe session (after a tokenize attempt) starts not-ready again.
      setReady(false);
    };
  }, [hostedFieldsKey, testMode, uid, sessionKey]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!consent) {
      setError("יש לאשר את תנאי השימוש ותנאי תקופת הניסיון כדי להמשיך.");
      return;
    }
    const instance = instanceRef.current;
    if (!instance) return;
    setBusy(true);
    try {
      const result = await instance.tokenize({
        payerFirstName: payer.firstName.trim(),
        payerLastName: payer.lastName.trim(),
        payerEmail: payer.email.trim(),
        payerPhone: payer.phone.trim(),
        total: { label: `${planName} — נווה שמיר`, amount: { currency: "ILS", value: amountValue } },
      });

      if (result.type !== "tokenize-success" || !result.token) {
        const first = result.errors ? Object.values(result.errors)[0] : null;
        const detail = typeof first === "string" ? first : first?.message;
        setError(detail ?? "פרטי הכרטיס אינם תקינים. בדקו ונסו שוב.");
        // A tokenize attempt consumes the PayMe session — start a fresh one for the next try.
        setSessionKey((value) => value + 1);
        return;
      }

      const outcome = await activateTrialWithPaymentMethodAction({ token: result.token, cardMask: result.card?.cardMask ?? null, consent });
      if (outcome.status === "success") {
        router.push("/business/dashboard");
        router.refresh();
        return;
      }
      setError(outcome.message ?? "אירעה תקלה. לא בוצע חיוב.");
      setSessionKey((value) => value + 1);
    } catch {
      setError("אירעה תקלה בתקשורת. לא בוצע חיוב. נסו שוב.");
      setSessionKey((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }, [amountValue, consent, payer, planName, router]);

  if (loadError) {
    return (
      <p className={styles.error} role="alert">
        לא הצלחנו לטעון את טופס התשלום המאובטח. רעננו את העמוד ונסו שוב.
      </p>
    );
  }

  return (
    <div className={styles.form}>
      <p className={styles.lead}>
        כדי להפעיל את {trialDays} ימי הניסיון יש להזין אמצעי תשלום. <strong>לא יבוצע חיוב במהלך תקופת הניסיון</strong> — החיוב הראשון ({priceLabel}, מחיר השקה) יתבצע רק בסיומה, אלא אם תבטלו קודם.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={`${uid}-fn`}>שם פרטי</label>
          <input id={`${uid}-fn`} autoComplete="given-name" value={payer.firstName} onChange={(e) => setPayer((p) => ({ ...p, firstName: e.target.value }))} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${uid}-ln`}>שם משפחה</label>
          <input id={`${uid}-ln`} autoComplete="family-name" value={payer.lastName} onChange={(e) => setPayer((p) => ({ ...p, lastName: e.target.value }))} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${uid}-em`}>אימייל</label>
          <input id={`${uid}-em`} type="email" dir="ltr" autoComplete="email" value={payer.email} onChange={(e) => setPayer((p) => ({ ...p, email: e.target.value }))} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${uid}-ph`}>טלפון</label>
          <input id={`${uid}-ph`} type="tel" dir="ltr" autoComplete="tel" value={payer.phone} onChange={(e) => setPayer((p) => ({ ...p, phone: e.target.value }))} />
        </div>
      </div>

      <div className={styles.cardBox} aria-busy={!ready}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>מספר כרטיס</span>
          <div id={`${uid}-number`} className={styles.hosted} />
        </div>
        <div className={styles.cardRow}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>תוקף</span>
            <div id={`${uid}-expiry`} className={styles.hosted} />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>CVV</span>
            <div id={`${uid}-cvc`} className={styles.hosted} />
          </div>
        </div>
        <p className={styles.secure}>פרטי הכרטיס מוזנים ישירות בטופס המאובטח של PayMe ואינם נשמרים או עוברים בשרתי הפורטל.</p>
      </div>

      <label className={styles.consent}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>קראתי ואני מאשר/ת את תנאי השימוש ואת תנאי תקופת הניסיון והחיוב שלאחריה.</span>
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button type="button" variant="accent" fullWidth disabled={!ready || busy} onClick={handleSubmit}>
        {busy ? "מפעילים…" : `הפעלת ${trialDays} ימי ניסיון`}
      </Button>
    </div>
  );
}

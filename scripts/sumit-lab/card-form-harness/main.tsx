import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SumitCardStep } from "@/components/business-dashboard/SumitCardForm/SumitCardStep";
import type { Harness, PendingCall } from "./harness-state";

// --- the harness control plane (window.__h); everything below is a MOCK ----------------------------------------------------------
let nextToken = 0;
const newToken = () => `00000000-0000-4000-8000-${String(++nextToken).padStart(12, "0")}`; // uuid-shaped, not a real token
const originalSetTimeout = window.setTimeout.bind(window);
// the form's 20 s wait for payments.js is shortened to 300 ms so the browser test does not sit still; all other delays are untouched
if (new URLSearchParams(location.search).get("real") !== "1") window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => originalSetTimeout(handler, delay === 20000 ? 300 : delay, ...args)) as typeof window.setTimeout; // (not in real mode: the real network needs the real 20 s)

let root: Root | null = null;
// REAL mode (?real=1): SUMIT's real payments.js is loaded by the form itself, with the CompanyID and public key of the TEST organization from the local server
const REAL = new URLSearchParams(location.search).get("real") === "1";
const realConfig = REAL ? ((await (await fetch("/config.json")).json()) as { companyId: number; apiPublicKey: string }) : null;
const h: Harness = {
  scenario: "ok",
  actionMode: "success",
  createTokenCalls: [],
  actionCalls: [],
  completed: 0,
  cardSaved: false,
  realTokenHashes: [],
  actionTokenHashes: [],
  realXhr: [],
  realProps: realConfig,
  savedCheckMode: "normal",
  savedCheckCalls: 0,
  pending: [],
  producedTokens: [],
  jqueryBeforeMount: typeof (window as unknown as { jQuery?: unknown }).jQuery,
  setTimeoutScaled: 20000,
  mount() {
    if (root) return;
    root = createRoot(document.getElementById("root")!);
    root.render(
      <StrictMode>
        <SumitCardStep companyId={realConfig?.companyId ?? 123456} apiPublicKey={realConfig?.apiPublicKey ?? "harness-public-key"} registrationId="55555555-5555-4555-8555-555555555555" onCompleted={() => { h.completed += 1; }} />
      </StrictMode>,
    );
  },
  unmount() {
    root?.unmount();
    root = null;
  },
  answerLate(id: number) {
    const call = h.pending.find((entry) => entry.id === id);
    if (!call) throw new Error("no such pending call");
    const token = newToken();
    h.producedTokens.push(token);
    const form = document.getElementById("sumit-card-form");
    const og = form?.querySelector<HTMLInputElement>("input[name='og-token']");
    if (og) og.value = token; // what the real script does before it calls back
    call.callback({ Status: 0, UserErrorMessage: null, TechnicalErrorDetails: null, Data: { SingleUseToken: token } });
    call.settledBy = "late-answer";
    return "answered";
  },
};
(window as unknown as { __h: Harness }).__h = h;

// REAL mode: record what SUMIT's real script does on the network - host, path and status only - and a HASH of the token in SUMIT's answer
async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
if (REAL) {
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    const text = String(url);
    const entry: Harness["realXhr"][number] = { host: (text.match(/^https?:\/\/([^/]+)/) ?? [])[1] ?? location.host, path: text.replace(/^https?:\/\/[^/]+/, "").split("?")[0], status: null };
    h.realXhr.push(entry);
    this.addEventListener("loadend", () => {
      entry.status = this.status;
      if (/tokenizesingleuse/.test(entry.path)) {
        try {
          const token = JSON.parse(this.responseText)?.Data?.SingleUseToken;
          if (typeof token === "string") void sha256(token).then((hash) => h.realTokenHashes.push(hash));
        } catch {
          // an unreadable answer simply records no hash
        }
      }
    });
    return open.apply(this, [method, url, ...rest] as never);
  } as typeof XMLHttpRequest.prototype.open;
}

// --- a stand-in for SUMIT's payments.js: same contract as the real script (observed in the prototype), no network ----------------
if (!REAL) (window as unknown as { OfficeGuy: unknown }).OfficeGuy = {
  Payments: {
    CreateToken(settings: { CompanyID: unknown; APIPublicKey: unknown; FormSelector: string; ResponseCallback: (response: unknown) => void }) {
      const form = document.querySelector<HTMLFormElement>(settings.FormSelector);
      const valueOf = (marker: string) => form?.querySelector<HTMLInputElement>(`[data-og=${marker}]`)?.value ?? "";
      let og = form?.querySelector<HTMLInputElement>("input[name=og-token]") ?? null;
      if (!og && form) {
        og = document.createElement("input");
        og.type = "hidden";
        og.name = "og-token";
        form.appendChild(og);
      }
      const record = {
        cardLengths: { number: valueOf("cardnumber").length, month: valueOf("expirationmonth").length, year: valueOf("expirationyear").length, cvv: valueOf("cvv").length },
        ogTokenLengthBefore: og?.value.length ?? 0,
        companyId: settings.CompanyID,
        publicKeyIsString: typeof settings.APIPublicKey === "string",
        selector: settings.FormSelector,
        returned: undefined as unknown,
      };
      h.createTokenCalls.push(record);
      form?.querySelectorAll("[data-og]").forEach((element) => element.setAttribute("name", "")); // like the real script
      // like the real script: a hidden field that already holds a value makes it return true and send nothing
      if (og && og.value.length > 0) {
        record.returned = true;
        return true;
      }
      record.returned = false;
      const id = h.createTokenCalls.length;
      const pending: PendingCall = { id, callback: settings.ResponseCallback, settledBy: null };
      h.pending.push(pending);
      const answer = () => {
        const token = newToken();
        h.producedTokens.push(token);
        if (og) og.value = token;
        settings.ResponseCallback({ Status: 0, UserErrorMessage: null, TechnicalErrorDetails: null, Data: { SingleUseToken: token } });
      };
      if (h.scenario === "ok") originalSetTimeout(() => { pending.settledBy = "ok"; answer(); }, 120);
      else if (h.scenario === "twice") originalSetTimeout(() => { pending.settledBy = "twice"; answer(); answer(); }, 120);
      else if (h.scenario === "refused") originalSetTimeout(() => { pending.settledBy = "refused"; settings.ResponseCallback({ Status: 1, UserErrorMessage: "raw SUMIT text that must never be shown", TechnicalErrorDetails: null, Data: null }); }, 120);
      // "silent": never answers (the real script is silent when the request cannot be sent); tests answer late through __h.answerLate
      return false;
    },
  },
};

h.mount();

// --- test helpers for the browser session (window.__t): fill the form like a person would, click, read the visible state ----------
const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function setNative(element: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}
const t = {
  fill(withCard = true, withConsent = true) {
    setNative(q<HTMLInputElement>("#sumit-fn"), "נועה");
    setNative(q<HTMLInputElement>("#sumit-ln"), "לוי");
    setNative(q<HTMLInputElement>("#sumit-em"), "noa@example.com");
    setNative(q<HTMLInputElement>("#sumit-ph"), "054-521-8644");
    if (withCard) t.typeCard();
    const consent = q<HTMLInputElement>("input[type=checkbox]");
    if (withConsent && !consent.checked) consent.click();
  },
  // a documented SUMIT test card, typed with spaces and a 2-digit year (the form normalizes them)
  typeCard() {
    q<HTMLInputElement>("#sumit-card-number").value = "5326 1073 0002 0772";
    q<HTMLInputElement>("#sumit-card-month").value = "5";
    q<HTMLInputElement>("#sumit-card-year").value = "31";
    q<HTMLInputElement>("#sumit-card-cvv").value = "033";
  },
  button: () => [...document.querySelectorAll("button")].find((b) => /שמירת אמצעי התשלום|שומרים/.test(b.textContent ?? "")),
  cardLengths: () => ({ number: q<HTMLInputElement>("#sumit-card-number").value.length, month: q<HTMLInputElement>("#sumit-card-month").value.length, year: q<HTMLInputElement>("#sumit-card-year").value.length, cvv: q<HTMLInputElement>("#sumit-card-cvv").value.length }),
  errorText: () => document.querySelector("[role=alert]")?.textContent ?? null,
  ogTokenLength: () => document.querySelector<HTMLInputElement>("#sumit-card-form input[name=og-token]")?.value.length ?? null,
  sleep: (ms: number) => new Promise((resolve) => originalSetTimeout(resolve, ms)),
  snapshot: () => ({ createTokenCalls: h.createTokenCalls.length, actionCalls: h.actionCalls.length, completed: h.completed, error: document.getElementById("sumit-card-form") ? t.errorText() : "(form removed)", buttonDisabled: document.getElementById("sumit-card-form") ? (t.button()?.disabled ?? null) : null }),
};
(window as unknown as { __t: typeof t }).__t = t;

import "./scenarios";

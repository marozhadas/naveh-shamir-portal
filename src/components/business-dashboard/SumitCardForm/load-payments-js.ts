import { PAYMENTS_JS_URL, type PaymentsJsGlobal } from "@/lib/sumit/payments-js";

/**
 * Makes SUMIT's payments.js usable on the page: it needs a GLOBAL jQuery (observed: without it every call throws), which this
 * project bundles itself (exact version in package.json) instead of fetching a second third-party script, and then the script from
 * SUMIT. Idempotent: calling it again (React strict mode, a second form) neither loads jQuery nor the script twice.
 * Only `jQuery` is set on the window - never `$`, so nothing else on the page is shadowed.
 */

type ScriptLike = { src: string; async: boolean; addEventListener: (type: string, listener: () => void, options?: { once: boolean }) => void };
export type LoaderWindow = { jQuery?: unknown; OfficeGuy?: PaymentsJsGlobal };
export type LoaderDocument = {
  querySelector: (selector: string) => ScriptLike | null;
  createElement: (tag: "script") => ScriptLike;
  head: { appendChild: (node: ScriptLike) => unknown };
};

export async function ensurePaymentsJs(deps: { win: LoaderWindow; doc: LoaderDocument; importJquery: () => Promise<unknown> }): Promise<PaymentsJsGlobal> {
  const { win, doc } = deps;
  if (!win.jQuery) {
    const loaded = await deps.importJquery();
    win.jQuery = (loaded as { default?: unknown } | undefined)?.default ?? loaded;
  }

  if (!win.OfficeGuy) {
    await new Promise<void>((resolve, reject) => {
      const existing = doc.querySelector(`script[src="${PAYMENTS_JS_URL}"]`);
      const script = existing ?? doc.createElement("script");
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("payments-js-load-failed")), { once: true });
      if (!existing) {
        script.src = PAYMENTS_JS_URL;
        script.async = true;
        doc.head.appendChild(script);
      }
    });
  }

  const payments = win.OfficeGuy;
  if (!payments?.Payments || typeof payments.Payments.CreateToken !== "function") throw new Error("payments-js-unavailable");
  return payments;
}

import { describe, expect, it, vi } from "vitest";
import { PAYMENTS_JS_URL } from "@/lib/sumit/payments-js";
import { ensurePaymentsJs, type LoaderDocument, type LoaderWindow } from "./load-payments-js";

type Listener = () => void;
function makeDoc(options: { existingScript?: boolean } = {}) {
  const scripts: Array<{ src: string; async: boolean; listeners: Record<string, Listener[]> }> = [];
  const make = () => {
    const script = { src: "", async: false, listeners: {} as Record<string, Listener[]>, addEventListener(type: string, listener: Listener) { (script.listeners[type] ??= []).push(listener); } };
    return script;
  };
  const existing = options.existingScript ? make() : null;
  if (existing) {
    existing.src = PAYMENTS_JS_URL;
    scripts.push(existing);
  }
  const doc: LoaderDocument = {
    querySelector: (selector) => (selector.includes(PAYMENTS_JS_URL) ? existing : null),
    createElement: () => make(),
    head: { appendChild: (node) => { scripts.push(node as never); } },
  };
  return { doc, scripts, fire: (index: number, type: "load" | "error") => scripts[index].listeners[type]?.forEach((listener) => listener()) };
}
const payments = { Payments: { CreateToken: () => false } };

describe("ensurePaymentsJs", () => {
  it("loads jQuery (the bundled one) and only then SUMIT's script; sets window.jQuery and never window.$", async () => {
    const win: LoaderWindow & { $?: unknown } = {};
    const { doc, scripts, fire } = makeDoc();
    const jquery = vi.fn();
    const importJquery = vi.fn(async () => ({ default: jquery }));
    const promise = ensurePaymentsJs({ win, doc, importJquery });
    await vi.waitFor(() => expect(scripts).toHaveLength(1));
    expect(win.jQuery).toBe(jquery);
    expect(win.$).toBeUndefined();
    expect(scripts[0].src).toBe(PAYMENTS_JS_URL);
    expect(scripts[0].async).toBe(true);
    win.OfficeGuy = payments; // what the loaded script defines
    fire(0, "load");
    expect(await promise).toBe(payments);
  });

  it("is idempotent: with jQuery and the script already there nothing is loaded again", async () => {
    const win: LoaderWindow = { jQuery: () => undefined, OfficeGuy: payments };
    const { doc, scripts } = makeDoc();
    const importJquery = vi.fn();
    expect(await ensurePaymentsJs({ win, doc, importJquery })).toBe(payments);
    expect(importJquery).not.toHaveBeenCalled();
    expect(scripts).toHaveLength(0);
  });

  it("a script tag that is already on the page is waited for, not added a second time", async () => {
    const win: LoaderWindow = { jQuery: () => undefined };
    const { doc, scripts, fire } = makeDoc({ existingScript: true });
    const promise = ensurePaymentsJs({ win, doc, importJquery: vi.fn() });
    expect(scripts).toHaveLength(1);
    win.OfficeGuy = payments;
    fire(0, "load");
    expect(await promise).toBe(payments);
    expect(scripts).toHaveLength(1);
  });

  it("a script that fails to load, or that does not define CreateToken, is an error (the form shows its own message)", async () => {
    const failing = makeDoc();
    const failure = ensurePaymentsJs({ win: { jQuery: () => undefined }, doc: failing.doc, importJquery: vi.fn() });
    failing.fire(0, "error");
    await expect(failure).rejects.toThrow("payments-js-load-failed");

    const empty = makeDoc();
    const win: LoaderWindow = { jQuery: () => undefined };
    const broken = ensurePaymentsJs({ win, doc: empty.doc, importJquery: vi.fn() });
    win.OfficeGuy = { Payments: {} } as never;
    empty.fire(0, "load");
    await expect(broken).rejects.toThrow("payments-js-unavailable");
  });

  it("a jQuery that cannot be loaded is an error and nothing from SUMIT is loaded", async () => {
    const { doc, scripts } = makeDoc();
    await expect(ensurePaymentsJs({ win: {}, doc, importJquery: async () => { throw new Error("chunk failed"); } })).rejects.toThrow("chunk failed");
    expect(scripts).toHaveLength(0);
  });
});

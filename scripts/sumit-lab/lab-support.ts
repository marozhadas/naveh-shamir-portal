import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { vi } from "vitest";

/**
 * Support code for the LOCAL SUMIT test lab (never imported by the app, never part of a build, not run by `npm test`).
 *
 * What it guarantees:
 *   - it only ever talks to https://api.sumit.co.il/ (any other host is refused);
 *   - every request/response it records is redacted (no keys, no card number, no CVV, no token, no citizen id) and is written to
 *     scripts/sumit-lab/output/ (git-ignored) - the console only gets summaries;
 *   - the number of requests per run is capped (the test organization has about 400 API calls and 100 operations a month);
 *   - a step that changes data in SUMIT must be approved by name (SUMIT_LAB_APPROVED), and only after the organization was
 *     attested as the test organization;
 *   - raw card numbers are accepted only from the list of cards SUMIT documents as test cards.
 */

export const LAB_DIR = __dirname;
export const OUTPUT_DIR = path.join(LAB_DIR, "output");
export const ALLOWED_ORIGIN = "https://api.sumit.co.il/";
export const DEFAULT_MAX_CALLS = 30;

/** The steps that CHANGE data in SUMIT (customers, saved cards, tokens, charges, documents). Each needs explicit approval by name. */
export const DATA_CHANGING_STEPS = ["save-card", "null-token", "replace-card", "charge-saved", "charge-vat-false", "authorise-only", "no-method"] as const;
export type DataChangingStep = (typeof DATA_CHANGING_STEPS)[number];

export type TestCard = { id: string; brand: string; number: string; month: number; year: number; cvv: string };

/**
 * The cards SUMIT documents for its test terminal (help article 5832877). Anything else is refused by the lab: a real card
 * number can never be sent from here. Support recommends the second card in the official list.
 */
export const DOCUMENTED_TEST_CARDS: readonly TestCard[] = [
  { id: "mc-1", brand: "Mastercard", number: "5326105300985853", month: 4, year: 2026, cvv: "934" }, // expired in the official list: kept only so it is recognised as documented
  { id: "mc-2", brand: "Mastercard", number: "5326107300020772", month: 5, year: 2031, cvv: "033" }, // the one SUMIT support recommends
  { id: "mc-3", brand: "Mastercard", number: "5310840302789139", month: 5, year: 2031, cvv: "111" },
  { id: "mc-4", brand: "Mastercard", number: "5310840302789162", month: 5, year: 2031, cvv: "245" },
  { id: "mc-5", brand: "Mastercard", number: "5310840302789154", month: 5, year: 2031, cvv: "749" },
  { id: "visa-1", brand: "Visa", number: "4557430402321333", month: 5, year: 2031, cvv: "098" },
  { id: "visa-2", brand: "Visa", number: "4557430402821341", month: 5, year: 2031, cvv: "998" },
  { id: "visa-3", brand: "Visa", number: "4557440411874982", month: 5, year: 2031, cvv: "467" },
];

export const CARD_A = DOCUMENTED_TEST_CARDS.find((card) => card.id === "mc-2") as TestCard;
export const CARD_B = DOCUMENTED_TEST_CARDS.find((card) => card.id === "visa-1") as TestCard;
export const last4 = (value: string | null | undefined): string | null => (value ? value.replace(/\D/g, "").slice(-4) || null : null);

// --- environment -----------------------------------------------------------------------------------------------------------

/** Loads ONLY SUMIT_* / PAYMENTS_PROVIDER from .env.local (never prints a value; an already-set variable wins). Returns the NAMES loaded. */
export function loadLabEnv(file = path.resolve(LAB_DIR, "..", "..", ".env.local")): string[] {
  if (!existsSync(file)) return [];
  const loaded: string[] = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*(SUMIT_[A-Z0-9_]+|PAYMENTS_PROVIDER)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    if (value && process.env[match[1]] === undefined) {
      process.env[match[1]] = value;
      loaded.push(match[1]);
    }
  }
  return loaded;
}

export function approvedSteps(): Set<string> {
  return new Set((process.env.SUMIT_LAB_APPROVED ?? "").split(",").map((name) => name.trim()).filter(Boolean));
}

export function maxCalls(): number {
  const parsed = Number(process.env.SUMIT_LAB_MAX_CALLS);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : DEFAULT_MAX_CALLS;
}

// --- redaction -------------------------------------------------------------------------------------------------------------

const SENSITIVE_KEY = /^(APIKey|APIPublicKey|CVV|SingleUseToken|CitizenID|Track2|CreditCard_(Number|CVV|Track2|Token|CitizenID))$/i;

export function currentSecrets(): string[] {
  return [process.env.SUMIT_API_KEY, process.env.SUMIT_API_PUBLIC_KEY].filter((value): value is string => !!value && value.length >= 6);
}

export function redact(value: unknown, secrets: string[] = currentSecrets(), key = ""): unknown {
  if (key === "Credentials") return "<credentials omitted>";
  if (key === "CardNumber" && typeof value === "string") return `<card ****${value.slice(-4)}>`;
  if (SENSITIVE_KEY.test(key)) return value === null ? null : "<redacted>";
  if (typeof value === "string") return secrets.some((secret) => value.includes(secret)) ? "<redacted>" : value;
  if (Array.isArray(value)) return value.map((entry) => redact(entry, secrets));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, redact(entry, secrets, name)]));
  return value;
}

// --- recorder --------------------------------------------------------------------------------------------------------------

export type Exchange = { step: string; path: string; httpStatus: number | null; request: unknown; response: unknown };

/**
 * Wraps the global fetch: enforces the host allowlist and the call budget, forwards to the REAL fetch, and records a redacted copy
 * of every exchange. The app's own SUMIT client runs unchanged on top of it.
 */
export function installRecorder(limit: number) {
  const realFetch = globalThis.fetch;
  const exchanges: Exchange[] = [];
  let calls = 0;
  let step = "setup";

  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.startsWith(ALLOWED_ORIGIN)) throw new Error("sumit-lab refuses to call any host other than api.sumit.co.il");
    if (calls >= limit) throw new Error(`sumit-lab call budget exhausted (${limit}); raise SUMIT_LAB_MAX_CALLS deliberately if needed`);
    calls += 1;

    let request: unknown = null;
    try {
      request = JSON.parse(String(init?.body ?? "null"));
    } catch {
      request = "<non-JSON body>";
    }
    const response = await realFetch(input, init);
    let body: unknown = null;
    try {
      body = await response.clone().json();
    } catch {
      body = "<non-JSON response>";
    }
    exchanges.push({ step, path: url.slice(ALLOWED_ORIGIN.length - 1), httpStatus: response.status, request: redact(request), response: redact(body) });
    return response;
  });

  return {
    exchanges,
    calls: () => calls,
    setStep: (name: string) => {
      step = name;
    },
    lastResponse: (apiPath: string): unknown => [...exchanges].reverse().find((entry) => entry.path === apiPath)?.response ?? null,
    restore: () => vi.unstubAllGlobals(),
  };
}

export function writeOutput(name: string, data: unknown): string {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const file = path.join(OUTPUT_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}-${name}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

/** Prints a SUMMARY (values chosen by the caller - never raw payloads). */
export function report(step: string, summary: Record<string, unknown>): void {
  console.log(`\n[sumit-lab] ${step}\n${JSON.stringify(summary, null, 2)}`);
}

/** Field-level difference of two redacted payment objects: which keys exist only on one side, and which values differ. */
export function diffPayments(left: Record<string, unknown> | null, right: Record<string, unknown> | null): { onlyInFirst: string[]; onlyInSecond: string[]; differing: string[] } {
  const a = left ?? {};
  const b = right ?? {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = { onlyInFirst: [] as string[], onlyInSecond: [] as string[], differing: [] as string[] };
  for (const key of keys) {
    if (!(key in b)) out.onlyInFirst.push(key);
    else if (!(key in a)) out.onlyInSecond.push(key);
    else if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) out.differing.push(key);
  }
  return out;
}

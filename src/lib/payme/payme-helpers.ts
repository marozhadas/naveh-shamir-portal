/**
 * Pure PayMe helpers (no I/O, no secrets) — everything that can be decided without calling PayMe
 * lives here so it is unit-tested against the documented API (docs.payme.io → Subscriptions /
 * generate-subscription):
 *
 *  - amounts are agorot (sub_price 5075 = 50.75 ₪; PayMe's minimum is 500)
 *  - sub_iteration_type: 1 daily, 2 weekly, 3 monthly, 4 yearly
 *  - sub_start_date for monthly must have a day-of-month between 1 and 28
 *  - callback types: sub-create, sub-active, sub-iteration-success, sub-complete, sub-cancel, sub-failure
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { BillingInterval } from "@/data/subscription-pricing";

export const PAYME_MIN_SUB_PRICE_AGOROT = 500;

export function agorotFromIls(amountIls: number): number {
  return Math.round(amountIls * 100);
}

export function paymeIterationType(interval: BillingInterval): 3 | 4 {
  return interval === "monthly" ? 3 : 4;
}

const JERUSALEM = "Asia/Jerusalem";

function jerusalemParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: JERUSALEM,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** "dd/mm/yyyy hh:mm" in Israel time — the format of PayMe's own examples for sub_start_date. */
export function formatPayMeDate(date: Date): string {
  const p = jerusalemParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * When PayMe should take the first charge: exactly when the trial ends — never earlier, so the owner
 * is never billed inside the trial. PayMe only accepts a day-of-month of 1–28 for monthly
 * subscriptions, so a trial ending on the 29th–31st starts billing on the 1st of the NEXT month
 * (a few extra free days, never fewer). trial_ends_at on the subscription stays the trial's truth.
 */
export function computeSubscriptionStartDate(trialEndsAt: Date, interval: BillingInterval): Date {
  if (interval !== "monthly") return trialEndsAt;
  const p = jerusalemParts(trialEndsAt);
  if (p.day <= 28) return trialEndsAt;
  // 1st of next month at 00:05 Israel time — expressed as UTC safely (Israel is UTC+2/+3, so UTC 00:05 is
  // still the same calendar day there; then PayMe's own minute precision handles the rest).
  const nextMonth = p.month === 12 ? 1 : p.month + 1;
  const nextYear = p.month === 12 ? p.year + 1 : p.year;
  return new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 5, 0));
}

export const PAYME_NOTIFY_TYPES = ["sub-create", "sub-active", "sub-iteration-success", "sub-complete", "sub-cancel", "sub-failure"] as const;
export type PayMeNotifyType = (typeof PAYME_NOTIFY_TYPES)[number];

export function isPayMeNotifyType(value: unknown): value is PayMeNotifyType {
  return typeof value === "string" && (PAYME_NOTIFY_TYPES as readonly string[]).includes(value);
}

/** Human labels for the admin UI (real PayMe types → Hebrew). */
export const PAYME_NOTIFY_LABEL: Record<PayMeNotifyType, string> = {
  "sub-create": "מנוי נוצר",
  "sub-active": "מנוי שולם",
  "sub-iteration-success": "חיוב חוזר הצליח",
  "sub-complete": "המנוי הושלם",
  "sub-cancel": "מנוי בוטל",
  "sub-failure": "חיוב נכשל",
};

// ── Callback parsing (x-www-form-urlencoded POST to sub_callback_url) ───────────────────────────────

export type ParsedPayMeCallback = {
  notifyType: string | null;
  subPaymeId: string | null;
  /** Whatever transaction/sale identifier the callback carried, if any (PayMe's field names vary by event). */
  transactionId: string | null;
  /** The merchant-side subscription_id we passed at creation (our business registration id). */
  merchantSubscriptionId: string | null;
  fields: Record<string, string>;
};

const TRANSACTION_ID_KEYS = ["payme_transaction_id", "transaction_id", "sale_payme_id", "payme_sale_id"] as const;

export function parsePayMeCallbackBody(body: string): ParsedPayMeCallback {
  const params = new URLSearchParams(body);
  const fields: Record<string, string> = {};
  for (const [key, value] of params.entries()) fields[key] = value;

  const transactionId = TRANSACTION_ID_KEYS.map((key) => fields[key]).find((value) => value && value.length > 0) ?? null;
  return {
    notifyType: fields.notify_type || fields.notification_type || null,
    subPaymeId: fields.sub_payme_id || null,
    transactionId,
    merchantSubscriptionId: fields.subscription_id || null,
    fields,
  };
}

/**
 * The idempotency key of a callback: the same callback delivered twice yields the same id. PayMe's
 * documented callback has no dedicated event id, so it is a SHA-256 of the canonical (sorted)
 * form fields. (Money is protected a second time by the unique provider_transaction_id.)
 */
export function computeProviderEventId(fields: Record<string, string>): string {
  const canonical = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("&");
  return createHash("sha256").update(canonical).digest("hex");
}

/** Only these callback fields are ever stored (in billing_events.summary) — never tokens, card data or anything unknown. */
const SAFE_SUMMARY_KEYS = ["notify_type", "notification_type", "sub_payme_id", "subscription_id", "sub_status", "sub_iterations_completed", "sub_price", "sub_currency", "sub_next_date", "sub_prev_date"] as const;

export function safeCallbackSummary(fields: Record<string, string>): Record<string, string> {
  const summary: Record<string, string> = {};
  for (const key of SAFE_SUMMARY_KEYS) {
    if (fields[key] !== undefined) summary[key] = fields[key].slice(0, 120);
  }
  return summary;
}

/** Constant-time string comparison (for the webhook secret in the callback URL). */
export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Never put a token / secret into an error message or log line. */
export function redactSecrets(text: string, secrets: string[]): string {
  let output = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) output = output.split(secret).join("[redacted]");
  }
  return output;
}

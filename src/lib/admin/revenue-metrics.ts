/**
 * Pure revenue / subscription metrics for /admin/revenue — no I/O, no secrets, no invented numbers.
 *
 * The rules this module encodes (from the product brief):
 *  - "collected revenue" = money PayMe actually confirmed (billing_transactions with status succeeded) in the
 *    chosen period. A trial, a pending business or a failed charge is NEVER revenue.
 *  - MRR counts ONLY subscriptions with status "active"; a yearly price is divided by 12 for MRR/ARR purposes
 *    only (it is never shown as if charged monthly). MRR/ARR are *forecast* figures, labelled as such.
 *  - Trials are split into standard (30 days) and pilot (90 days) from the trial_days / offer_code SNAPSHOT stored
 *    on the subscription — never recomputed from today's offer. Legacy rows without a snapshot are standard.
 *  - A metric without enough real data is reported as null ("אין עדיין מספיק נתונים") rather than guessed.
 */

export type SubscriptionStatus = "trialing" | "active" | "past-due" | "grace-period" | "canceled" | "expired" | "paused";
export type OfferKey = "standard" | "pilot";

export type RevenueSubscription = {
  id: string;
  businessId: string;
  businessName: string;
  ownerName: string | null;
  planId: string;
  interval: "monthly" | "yearly" | null;
  priceIls: number | null;
  isLaunchPrice: boolean | null;
  offerCode: string | null;
  trialDays: number | null;
  status: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  nextBillingAt: string | null;
  paymentProvider: string | null;
  providerSubscriptionId: string | null;
  hasPaymentMethod: boolean;
  lastPaymentSucceededAt: string | null;
  lastPaymentFailedAt: string | null;
  paymentFailedAt: string | null;
  gracePeriodEndsAt: string | null;
  canceledAt: string | null;
  paymentFailureReason: string | null;
};

export type RevenueTransaction = {
  id: string;
  providerTransactionId: string;
  businessId: string | null;
  businessName: string | null;
  planId: string | null;
  interval: "monthly" | "yearly" | null;
  offerCode: string | null;
  kind: "charge" | "renewal" | "failed" | "refund";
  status: "succeeded" | "failed" | "pending" | "refunded";
  amountAgorot: number;
  occurredAt: string;
  failureReason: string | null;
};

export type RevenueBusinessEvent = { businessId: string; eventType: string; createdAt: string };

export type RevenueBillingEvent = {
  id: string;
  eventType: string;
  providerEventId: string;
  status: "received" | "processed" | "failed" | "ignored";
  error: string | null;
  receivedAt: string;
  businessId: string | null;
  providerSubscriptionId: string | null;
};

export function offerOf(subscription: Pick<RevenueSubscription, "offerCode">): OfferKey {
  return subscription.offerCode === "pilot_2026" ? "pilot" : "standard";
}

// ── Periods (Israel calendar days) ──────────────────────────────────────────────────────────────

export type PeriodPreset = "today" | "7d" | "30d" | "month" | "last-month" | "90d" | "year" | "custom";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "היום" },
  { value: "7d", label: "7 ימים" },
  { value: "30d", label: "30 ימים" },
  { value: "month", label: "החודש" },
  { value: "last-month", label: "חודש קודם" },
  { value: "90d", label: "90 ימים" },
  { value: "year", label: "השנה" },
  { value: "custom", label: "טווח מותאם" },
];

export type ResolvedPeriod = { preset: PeriodPreset; from: Date; to: Date; label: string };

const JERUSALEM = "Asia/Jerusalem";
const DAY_MS = 24 * 60 * 60 * 1000;

function jerusalemYmd(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: JERUSALEM, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** The UTC instant of 00:00 Israel time on a calendar day (DST-safe: the offset is looked up at that day). */
export function startOfJerusalemDay(y: number, m: number, d: number): Date {
  let guess = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 2; i += 1) {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: JERUSALEM, timeZoneName: "shortOffset" })
      .formatToParts(new Date(guess))
      .find((part) => part.type === "timeZoneName")?.value.match(/GMT([+-]\d+)/)?.[1];
    const hours = offset ? Number(offset) : 2;
    guess = Date.UTC(y, m - 1, d) - hours * 60 * 60 * 1000;
  }
  return new Date(guess);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone: JERUSALEM, day: "numeric", month: "numeric", year: "numeric" }).format(date);
}

export function resolvePeriod(preset: PeriodPreset, now: Date, customFrom?: string | null, customTo?: string | null): ResolvedPeriod {
  const today = jerusalemYmd(now);
  const startToday = startOfJerusalemDay(today.y, today.m, today.d);
  const tomorrow = new Date(startToday.getTime() + DAY_MS + 3 * 60 * 60 * 1000); // safely inside tomorrow
  const tm = jerusalemYmd(tomorrow);
  const endToday = startOfJerusalemDay(tm.y, tm.m, tm.d);

  const label = (from: Date, to: Date) => `${formatShortDate(from)} – ${formatShortDate(new Date(to.getTime() - 1))}`;

  switch (preset) {
    case "today":
      return { preset, from: startToday, to: endToday, label: formatShortDate(startToday) };
    case "7d": {
      const from = new Date(startToday.getTime() - 6 * DAY_MS);
      return { preset, from, to: endToday, label: label(from, endToday) };
    }
    case "30d": {
      const from = new Date(startToday.getTime() - 29 * DAY_MS);
      return { preset, from, to: endToday, label: label(from, endToday) };
    }
    case "90d": {
      const from = new Date(startToday.getTime() - 89 * DAY_MS);
      return { preset, from, to: endToday, label: label(from, endToday) };
    }
    case "month": {
      const from = startOfJerusalemDay(today.y, today.m, 1);
      return { preset, from, to: endToday, label: label(from, endToday) };
    }
    case "last-month": {
      const prevMonth = today.m === 1 ? 12 : today.m - 1;
      const prevYear = today.m === 1 ? today.y - 1 : today.y;
      const from = startOfJerusalemDay(prevYear, prevMonth, 1);
      const to = startOfJerusalemDay(today.y, today.m, 1);
      return { preset, from, to, label: label(from, to) };
    }
    case "year": {
      const from = startOfJerusalemDay(today.y, 1, 1);
      return { preset, from, to: endToday, label: label(from, endToday) };
    }
    case "custom": {
      const parse = (value: string | null | undefined): { y: number; m: number; d: number } | null => {
        const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
        return match ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) } : null;
      };
      const a = parse(customFrom);
      const b = parse(customTo);
      if (!a || !b) return resolvePeriod("30d", now);
      let from = startOfJerusalemDay(a.y, a.m, a.d);
      const lastDay = startOfJerusalemDay(b.y, b.m, b.d);
      if (lastDay.getTime() < from.getTime()) from = lastDay;
      const afterLast = new Date(Math.max(lastDay.getTime(), from.getTime()) + DAY_MS + 3 * 60 * 60 * 1000);
      const al = jerusalemYmd(afterLast);
      const to = startOfJerusalemDay(al.y, al.m, al.d);
      return { preset, from, to, label: label(from, to) };
    }
  }
}

export function isPeriodPreset(value: unknown): value is PeriodPreset {
  return typeof value === "string" && PERIOD_PRESETS.some((p) => p.value === value);
}

function inPeriod(iso: string | null | undefined, period: ResolvedPeriod): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= period.from.getTime() && t < period.to.getTime();
}

// ── KPIs ──────────────────────────────────────────────────────────────────────────────────────

export type TrialSplit = { standard: number; pilot: number; total: number };

export type RevenueKpis = {
  /** Agorot actually collected (PayMe-confirmed, succeeded) in the period. */
  collectedAgorot: number;
  collectedTransactions: number;
  /** Forecast, not cash: monthly-equivalent of ACTIVE subscriptions (yearly ÷ 12). null when no active subscription has a price snapshot. */
  mrrIls: number | null;
  /** Forecast = MRR × 12 — null whenever MRR is null. */
  arrIls: number | null;
  activePaying: number;
  trialing: TrialSplit;
  failedNow: number;
  needsAttention: number;
};

export function computeTrialSplit(subscriptions: RevenueSubscription[]): TrialSplit {
  const trialing = subscriptions.filter((s) => s.status === "trialing");
  const pilot = trialing.filter((s) => offerOf(s) === "pilot").length;
  return { standard: trialing.length - pilot, pilot, total: trialing.length };
}

export function computeMrrIls(subscriptions: RevenueSubscription[]): number | null {
  const active = subscriptions.filter((s) => s.status === "active" && s.priceIls !== null && s.interval !== null);
  if (active.length === 0) return null;
  const total = active.reduce((sum, s) => sum + (s.interval === "yearly" ? (s.priceIls as number) / 12 : (s.priceIls as number)), 0);
  return Math.round(total * 100) / 100;
}

export function computeCollectedAgorot(transactions: RevenueTransaction[], period: ResolvedPeriod): { amount: number; count: number } {
  const succeeded = transactions.filter((t) => t.status === "succeeded" && (t.kind === "charge" || t.kind === "renewal") && inPeriod(t.occurredAt, period));
  return { amount: succeeded.reduce((sum, t) => sum + t.amountAgorot, 0), count: succeeded.length };
}

export function computeKpis(input: {
  subscriptions: RevenueSubscription[];
  transactions: RevenueTransaction[];
  attentionCount: number;
  period: ResolvedPeriod;
}): RevenueKpis {
  const collected = computeCollectedAgorot(input.transactions, input.period);
  const mrr = computeMrrIls(input.subscriptions);
  return {
    collectedAgorot: collected.amount,
    collectedTransactions: collected.count,
    mrrIls: mrr,
    arrIls: mrr === null ? null : Math.round(mrr * 12 * 100) / 100,
    activePaying: input.subscriptions.filter((s) => s.status === "active").length,
    trialing: computeTrialSplit(input.subscriptions),
    failedNow: input.subscriptions.filter((s) => s.status === "past-due" || s.status === "grace-period").length,
    needsAttention: input.attentionCount,
  };
}

// ── Revenue over time ───────────────────────────────────────────────────────────────────────────

export type Granularity = "day" | "week" | "month";

export type RevenueBucket = { key: string; label: string; amountAgorot: number };

function bucketKey(date: Date, granularity: Granularity): { key: string; label: string } {
  const { y, m, d } = jerusalemYmd(date);
  if (granularity === "month") return { key: `${y}-${String(m).padStart(2, "0")}`, label: `${String(m).padStart(2, "0")}/${y}` };
  if (granularity === "day") return { key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, label: `${d}/${m}` };
  // week: starts on Sunday (Israel)
  const local = new Date(Date.UTC(y, m - 1, d));
  const weekStart = new Date(local.getTime() - local.getUTCDay() * DAY_MS);
  const key = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}-${String(weekStart.getUTCDate()).padStart(2, "0")}`;
  return { key, label: `${weekStart.getUTCDate()}/${weekStart.getUTCMonth() + 1}` };
}

/** Collected revenue (succeeded charges only), bucketed over the period, zero-filled so gaps are visible as gaps. */
export function computeRevenueSeries(transactions: RevenueTransaction[], period: ResolvedPeriod, granularity: Granularity): RevenueBucket[] {
  const buckets = new Map<string, RevenueBucket>();
  const step = granularity === "day" ? DAY_MS : granularity === "week" ? 7 * DAY_MS : 28 * DAY_MS;
  for (let t = period.from.getTime(); t < period.to.getTime(); t += step / 2) {
    const { key, label } = bucketKey(new Date(t), granularity);
    if (!buckets.has(key)) buckets.set(key, { key, label, amountAgorot: 0 });
    if (buckets.size > 400) break;
  }
  const lastKey = bucketKey(new Date(period.to.getTime() - 1), granularity);
  if (!buckets.has(lastKey.key)) buckets.set(lastKey.key, { key: lastKey.key, label: lastKey.label, amountAgorot: 0 });

  for (const tx of transactions) {
    if (tx.status !== "succeeded" || (tx.kind !== "charge" && tx.kind !== "renewal") || !inPeriod(tx.occurredAt, period)) continue;
    const { key } = bucketKey(new Date(tx.occurredAt), granularity);
    const bucket = buckets.get(key);
    if (bucket) bucket.amountAgorot += tx.amountAgorot;
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export type RevenueBreakdownRow = { key: string; label: string; amountAgorot: number; count: number };

export function computeRevenueBreakdown(transactions: RevenueTransaction[], period: ResolvedPeriod, by: "plan" | "interval"): RevenueBreakdownRow[] {
  const rows = new Map<string, RevenueBreakdownRow>();
  const labels: Record<string, string> = { plus: "Plus", premium: "Premium", monthly: "חודשי", yearly: "שנתי", unknown: "לא ידוע" };
  for (const tx of transactions) {
    if (tx.status !== "succeeded" || (tx.kind !== "charge" && tx.kind !== "renewal") || !inPeriod(tx.occurredAt, period)) continue;
    const key = (by === "plan" ? tx.planId : tx.interval) ?? "unknown";
    const row = rows.get(key) ?? { key, label: labels[key] ?? key, amountAgorot: 0, count: 0 };
    row.amountAgorot += tx.amountAgorot;
    row.count += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.amountAgorot - a.amountAgorot);
}

// ── Needs attention ─────────────────────────────────────────────────────────────────────────────

export type AttentionKind = "payment-failed" | "grace-ending" | "past-due" | "webhook-failed" | "not-syncing";

export type AttentionItem = {
  kind: AttentionKind;
  businessId: string | null;
  businessName: string | null;
  message: string;
  /** Days left in the grace period (only for payment-failed / grace-ending). */
  graceDaysLeft: number | null;
  graceEndsAt: string | null;
  failedAt: string | null;
  reason: string | null;
  amountIls: number | null;
  urgent: boolean;
};

const GRACE_WARNING_DAYS = 2;
const NOT_SYNCING_AFTER_MS = 24 * 60 * 60 * 1000;
const STALE_RECEIVED_MS = 10 * 60 * 1000;

export function computeAttention(input: { subscriptions: RevenueSubscription[]; billingEvents: RevenueBillingEvent[]; now: Date }): AttentionItem[] {
  const { now } = input;
  const items: AttentionItem[] = [];
  const nameById = new Map(input.subscriptions.map((s) => [s.businessId, s.businessName]));

  for (const sub of input.subscriptions) {
    if (sub.status === "grace-period") {
      const daysLeft = sub.gracePeriodEndsAt ? Math.max(0, Math.ceil((new Date(sub.gracePeriodEndsAt).getTime() - now.getTime()) / DAY_MS)) : null;
      const urgent = daysLeft !== null && daysLeft < GRACE_WARNING_DAYS;
      items.push({
        kind: urgent ? "grace-ending" : "payment-failed",
        businessId: sub.businessId,
        businessName: sub.businessName,
        message: urgent ? `תקופת החסד של "${sub.businessName}" עומדת להסתיים` : `התשלום של "${sub.businessName}" נכשל`,
        graceDaysLeft: daysLeft,
        graceEndsAt: sub.gracePeriodEndsAt,
        failedAt: sub.paymentFailedAt ?? sub.lastPaymentFailedAt,
        reason: sub.paymentFailureReason,
        amountIls: sub.priceIls,
        urgent,
      });
    } else if (sub.status === "past-due") {
      items.push({
        kind: "past-due",
        businessId: sub.businessId,
        businessName: sub.businessName,
        message: `תקופת החסד של "${sub.businessName}" הסתיימה — העסק איבד את ההטבות`,
        graceDaysLeft: 0,
        graceEndsAt: sub.gracePeriodEndsAt,
        failedAt: sub.paymentFailedAt ?? sub.lastPaymentFailedAt,
        reason: sub.paymentFailureReason,
        amountIls: sub.priceIls,
        urgent: true,
      });
    } else if (
      sub.status === "trialing" &&
      sub.paymentProvider === "payme" &&
      sub.trialEndsAt &&
      now.getTime() - new Date(sub.trialEndsAt).getTime() > NOT_SYNCING_AFTER_MS
    ) {
      items.push({
        kind: "not-syncing",
        businessId: sub.businessId,
        businessName: sub.businessName,
        message: `המנוי של "${sub.businessName}" לא מסתנכרן עם PayMe — הניסיון הסתיים ולא התקבל אישור חיוב`,
        graceDaysLeft: null,
        graceEndsAt: null,
        failedAt: null,
        reason: null,
        amountIls: sub.priceIls,
        urgent: true,
      });
    }
  }

  for (const event of input.billingEvents) {
    const stale = event.status === "received" && now.getTime() - new Date(event.receivedAt).getTime() > STALE_RECEIVED_MS;
    if (event.status !== "failed" && !stale) continue;
    items.push({
      kind: "webhook-failed",
      businessId: event.businessId,
      businessName: event.businessId ? (nameById.get(event.businessId) ?? null) : null,
      message: `אירוע סליקה לא עובד (${event.eventType})`,
      graceDaysLeft: null,
      graceEndsAt: null,
      failedAt: event.receivedAt,
      reason: event.error,
      amountIls: null,
      urgent: false,
    });
  }

  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}

// ── Trial → paid conversion, pilot ────────────────────────────────────────────────────────────────

export type ConversionStats = {
  /** Trials whose end date fell inside the period — the only fair cohort for "did it convert". */
  endedInPeriod: number;
  converted: number;
  /** null when the cohort is empty — shown as "אין עדיין מספיק נתונים", never as 0%. */
  rate: number | null;
};

function hasSucceededCharge(subscriptionId: string, transactions: RevenueTransaction[], businessId: string): boolean {
  return transactions.some((t) => t.businessId === businessId && t.status === "succeeded" && (t.kind === "charge" || t.kind === "renewal"));
}

export function computeConversion(subscriptions: RevenueSubscription[], transactions: RevenueTransaction[], period: ResolvedPeriod, offer: OfferKey | "all"): ConversionStats {
  const cohort = subscriptions.filter((s) => s.trialStartedAt && inPeriod(s.trialEndsAt, period) && (offer === "all" || offerOf(s) === offer));
  const converted = cohort.filter((s) => hasSucceededCharge(s.id, transactions, s.businessId)).length;
  return { endedInPeriod: cohort.length, converted, rate: cohort.length === 0 ? null : Math.round((converted / cohort.length) * 1000) / 10 };
}

export type SummaryMetrics = {
  newPayingSubscriptions: number;
  trialsStarted: TrialSplit;
  conversion: { standard: ConversionStats; pilot: ConversionStats; all: ConversionStats };
  cancellations: number;
  failedPayments: number;
  recoveredPayments: number;
};

export function computeSummaryMetrics(input: {
  subscriptions: RevenueSubscription[];
  transactions: RevenueTransaction[];
  businessEvents: RevenueBusinessEvent[];
  period: ResolvedPeriod;
}): SummaryMetrics {
  const { subscriptions, transactions, businessEvents, period } = input;
  const started = subscriptions.filter((s) => inPeriod(s.trialStartedAt, period));
  const startedPilot = started.filter((s) => offerOf(s) === "pilot").length;
  return {
    newPayingSubscriptions: transactions.filter((t) => t.kind === "charge" && t.status === "succeeded" && inPeriod(t.occurredAt, period)).length,
    trialsStarted: { standard: started.length - startedPilot, pilot: startedPilot, total: started.length },
    conversion: {
      standard: computeConversion(subscriptions, transactions, period, "standard"),
      pilot: computeConversion(subscriptions, transactions, period, "pilot"),
      all: computeConversion(subscriptions, transactions, period, "all"),
    },
    cancellations: subscriptions.filter((s) => inPeriod(s.canceledAt, period)).length,
    failedPayments: transactions.filter((t) => t.status === "failed" && inPeriod(t.occurredAt, period)).length,
    recoveredPayments: businessEvents.filter((e) => e.eventType === "payment_recovered" && inPeriod(e.createdAt, period)).length,
  };
}

export type PilotSummary = {
  pilotBusinesses: number;
  trialStarted: number;
  trialing: number;
  convertedToPaid: number;
  failedFirstCharge: number;
  /** Per trialing pilot business: how many days remain. */
  remaining: { businessId: string; businessName: string; daysLeft: number }[];
};

export function computePilotSummary(subscriptions: RevenueSubscription[], transactions: RevenueTransaction[], pilotBusinesses: number, now: Date): PilotSummary {
  const pilot = subscriptions.filter((s) => offerOf(s) === "pilot");
  const paid = (s: RevenueSubscription) => hasSucceededCharge(s.id, transactions, s.businessId);
  const failedFirst = (s: RevenueSubscription) =>
    !paid(s) && transactions.some((t) => t.businessId === s.businessId && t.status === "failed");
  return {
    pilotBusinesses,
    trialStarted: pilot.length,
    trialing: pilot.filter((s) => s.status === "trialing").length,
    convertedToPaid: pilot.filter(paid).length,
    failedFirstCharge: pilot.filter(failedFirst).length,
    remaining: pilot
      .filter((s) => s.status === "trialing" && s.trialEndsAt)
      .map((s) => ({ businessId: s.businessId, businessName: s.businessName, daysLeft: Math.max(0, Math.ceil((new Date(s.trialEndsAt as string).getTime() - now.getTime()) / DAY_MS)) })),
  };
}

// ── Subscriptions table filters ─────────────────────────────────────────────────────────────────

export type SubscriptionFilters = {
  plan?: "plus" | "premium";
  offer?: OfferKey;
  interval?: "monthly" | "yearly";
  status?: SubscriptionStatus;
};

export function filterSubscriptions(subscriptions: RevenueSubscription[], filters: SubscriptionFilters): RevenueSubscription[] {
  return subscriptions.filter(
    (s) =>
      (!filters.plan || s.planId === filters.plan) &&
      (!filters.offer || offerOf(s) === filters.offer) &&
      (!filters.interval || s.interval === filters.interval) &&
      (!filters.status || s.status === filters.status),
  );
}

export function daysLeft(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS));
}

// ── Display helpers ─────────────────────────────────────────────────────────────────────────────

export function formatAgorotAsIls(agorot: number): string {
  const ils = agorot / 100;
  return `${new Intl.NumberFormat("he-IL", { minimumFractionDigits: ils % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(ils)} ₪`;
}

export const SUBSCRIPTION_STATUS_HE: Record<SubscriptionStatus, string> = {
  trialing: "בתקופת ניסיון",
  active: "פעיל",
  "past-due": "חיוב נכשל — חסד הסתיים",
  "grace-period": "תקופת חסד",
  canceled: "בוטל",
  expired: "הניסיון הסתיים",
  paused: "מושהה",
};

export const TRANSACTION_KIND_HE: Record<RevenueTransaction["kind"], string> = {
  charge: "חיוב מנוי",
  renewal: "חידוש",
  failed: "חיוב שנכשל",
  refund: "זיכוי",
};

export const TRANSACTION_STATUS_HE: Record<RevenueTransaction["status"], string> = {
  succeeded: "הצליח",
  failed: "נכשל",
  pending: "ממתין",
  refunded: "זוכה",
};

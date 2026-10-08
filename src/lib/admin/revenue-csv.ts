import { SUBSCRIPTION_STATUS_HE, TRANSACTION_KIND_HE, TRANSACTION_STATUS_HE, offerOf, type RevenueBucket, type RevenueSubscription, type RevenueTransaction } from "./revenue-metrics";

/**
 * CSV builders for the admin export. They only ever see the already-sanitised row types from
 * revenue-metrics.ts — which contain no card data, no payment token and no secret — so nothing sensitive can be
 * exported by construction. Cells starting with = + - @ are neutralised (spreadsheet formula injection), and the
 * file starts with a UTF-8 BOM so Excel opens the Hebrew correctly.
 */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [header.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

const ils = (agorot: number) => (agorot / 100).toFixed(2);
const planName = (plan: string | null) => (plan === "plus" ? "Plus" : plan === "premium" ? "Premium" : (plan ?? ""));
const intervalName = (interval: string | null) => (interval === "monthly" ? "חודשי" : interval === "yearly" ? "שנתי" : "");

export function transactionsToCsv(transactions: RevenueTransaction[]): string {
  return toCsv(
    ["תאריך", "עסק", "חבילה", "מסלול", "סכום (₪)", "סוג פעולה", "סטטוס", "מזהה עסקה (PayMe)", "סיבת כשל"],
    transactions.map((t) => [
      t.occurredAt,
      t.businessName,
      planName(t.planId),
      intervalName(t.interval),
      ils(t.amountAgorot),
      TRANSACTION_KIND_HE[t.kind],
      TRANSACTION_STATUS_HE[t.status],
      t.providerTransactionId,
      t.failureReason,
    ]),
  );
}

export function subscriptionsToCsv(subscriptions: RevenueSubscription[]): string {
  return toCsv(
    ["עסק", "חבילה", "מסלול", "מחיר מנוי (₪, snapshot)", "מחיר השקה", "קבוצת הטבה", "ימי ניסיון", "סטטוס", "סיום ניסיון", "חיוב הבא", "אמצעי תשלום", "תשלום אחרון שהצליח", "כשל אחרון"],
    subscriptions.map((s) => [
      s.businessName,
      planName(s.planId),
      intervalName(s.interval),
      s.priceIls,
      s.isLaunchPrice ? "כן" : "",
      offerOf(s) === "pilot" ? "פיילוט" : "רגיל",
      s.trialDays ?? (offerOf(s) === "pilot" ? 90 : 30),
      SUBSCRIPTION_STATUS_HE[s.status],
      s.trialEndsAt,
      s.nextBillingAt,
      s.hasPaymentMethod ? "מוגדר" : "לא מוגדר",
      s.lastPaymentSucceededAt,
      s.lastPaymentFailedAt,
    ]),
  );
}

export function revenueSeriesToCsv(series: RevenueBucket[], granularityLabel: string): string {
  return toCsv([granularityLabel, "הכנסות בפועל (₪)"], series.map((bucket) => [bucket.label, ils(bucket.amountAgorot)]));
}

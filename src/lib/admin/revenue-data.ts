import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type {
  RevenueBillingEvent,
  RevenueBusinessEvent,
  RevenueSubscription,
  RevenueTransaction,
  SubscriptionStatus,
} from "./revenue-metrics";

/**
 * Reads everything /admin/revenue needs, with the service role (admin pages only — the page itself sits behind
 * the admin layout guard and the CSV route re-checks the admin session). Selects explicit columns: the payment
 * token table is only ever asked "does this business have a method" (never its token column), and nothing here
 * returns card data, tokens, secrets or the webhook secret.
 */

export type RevenueAuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  adminId: string | null;
  businessId: string | null;
  businessName: string | null;
  before: string | null;
  after: string | null;
  reason: string | null;
};

export type RevenueData = {
  subscriptions: RevenueSubscription[];
  transactions: RevenueTransaction[];
  billingEvents: RevenueBillingEvent[];
  businessEvents: RevenueBusinessEvent[];
  audit: RevenueAuditEntry[];
  pilotBusinessCount: number;
};

const SUBSCRIPTION_AUDIT_ACTIONS = ["business-plan-changed", "business-pilot-assigned", "business-pilot-removed", "business-offer-changed", "business-billing-test-changed"];

export async function loadRevenueData(): Promise<RevenueData> {
  const admin = createAdminSupabaseClient();

  const [subsResult, txResult, eventsResult, methodsResult, businessEventsResult, auditResult, pilotCount] = await Promise.all([
    admin.from("business_subscriptions").select("*").order("created_at", { ascending: false }).limit(2000),
    admin.from("billing_transactions").select("*").order("occurred_at", { ascending: false }).limit(5000),
    admin
      .from("billing_events")
      .select("id, event_type, provider_event_id, status, error, received_at, business_registration_id, provider_subscription_id")
      .order("received_at", { ascending: false })
      .limit(300),
    admin.from("billing_payment_methods").select("business_registration_id"),
    admin.from("business_events_log").select("business_registration_id, event_type, created_at").eq("event_type", "payment_recovered").limit(2000),
    admin.from("admin_audit_log").select("id, action, created_at, admin_id, entity_id, metadata").in("action", SUBSCRIPTION_AUDIT_ACTIONS).order("created_at", { ascending: false }).limit(60),
    admin.from("business_registrations").select("*", { count: "exact", head: true }).eq("offer_code", "pilot_2026"),
  ]);

  const subRows = subsResult.data ?? [];
  const ids = [...new Set([...subRows.map((s) => s.business_registration_id), ...(auditResult.data ?? []).map((a) => a.entity_id).filter((id): id is string => Boolean(id))])];
  const registrations =
    ids.length > 0 ? ((await admin.from("business_registrations").select("id, business_name, contact_name").in("id", ids)).data ?? []) : [];
  const registrationById = new Map(registrations.map((r) => [r.id, r]));
  const withMethod = new Set((methodsResult.data ?? []).map((m) => m.business_registration_id));

  const subscriptions: RevenueSubscription[] = subRows.map((s) => {
    const reg = registrationById.get(s.business_registration_id);
    return {
      id: s.id,
      businessId: s.business_registration_id,
      businessName: reg?.business_name ?? "עסק שנמחק",
      ownerName: reg?.contact_name ?? null,
      planId: s.plan_id,
      interval: s.billing_interval,
      priceIls: s.price_amount_ils,
      isLaunchPrice: s.is_launch_price,
      offerCode: s.offer_code,
      trialDays: s.trial_days,
      status: s.status as SubscriptionStatus,
      trialStartedAt: s.trial_started_at,
      trialEndsAt: s.trial_ends_at,
      nextBillingAt: s.next_billing_at,
      paymentProvider: s.payment_provider,
      providerSubscriptionId: s.provider_subscription_id,
      hasPaymentMethod: withMethod.has(s.business_registration_id),
      lastPaymentSucceededAt: s.last_payment_succeeded_at,
      lastPaymentFailedAt: s.last_payment_failed_at,
      paymentFailedAt: s.payment_failed_at,
      gracePeriodEndsAt: s.grace_period_ends_at,
      canceledAt: s.canceled_at,
      paymentFailureReason: s.payment_failure_reason,
    };
  });

  const transactions: RevenueTransaction[] = (txResult.data ?? []).map((t) => ({
    id: t.id,
    providerTransactionId: t.provider_transaction_id,
    businessId: t.business_registration_id,
    businessName: t.business_name,
    planId: t.plan_id,
    interval: t.billing_interval,
    offerCode: t.offer_code,
    kind: t.kind,
    status: t.status,
    amountAgorot: t.amount_agorot,
    occurredAt: t.occurred_at,
    failureReason: t.failure_reason,
  }));

  const billingEvents: RevenueBillingEvent[] = (eventsResult.data ?? []).map((e) => ({
    id: e.id,
    eventType: e.event_type,
    providerEventId: e.provider_event_id,
    status: e.status,
    error: e.error,
    receivedAt: e.received_at,
    businessId: e.business_registration_id,
    providerSubscriptionId: e.provider_subscription_id,
  }));

  const businessEvents: RevenueBusinessEvent[] = (businessEventsResult.data ?? []).map((e) => ({
    businessId: e.business_registration_id ?? "",
    eventType: e.event_type,
    createdAt: e.created_at,
  }));

  const audit: RevenueAuditEntry[] = (auditResult.data ?? []).map((a) => {
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    const str = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : null);
    return {
      id: a.id,
      action: a.action,
      createdAt: a.created_at,
      adminId: a.admin_id,
      businessId: a.entity_id,
      businessName: a.entity_id ? (registrationById.get(a.entity_id)?.business_name ?? str("businessName")) : str("businessName"),
      before: str("previousOffer") ?? str("previousPlan") ?? str("previousBillingTest"),
      after: str("newOffer") ?? str("newPlan") ?? str("newBillingTest"),
      reason: str("reason"),
    };
  });

  return { subscriptions, transactions, billingEvents, businessEvents, audit, pilotBusinessCount: pilotCount.count ?? 0 };
}

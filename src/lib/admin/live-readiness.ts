import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { findLiveReadinessIssues, type LiveReadinessIssue } from "@/lib/payme/live-readiness";

export type LiveReadinessReport = { checked: boolean; ready: boolean; issueCount: number; issues: LiveReadinessIssue[] };

/**
 * Read-only check for the admin: which pending paid registrations have no saved payment method. It changes nothing, creates
 * no card and no subscription, and never selects the buyer_key - the payment-method query reads the registration ids only.
 */
export async function getLiveReadinessReport(): Promise<LiveReadinessReport> {
  if (!isSupabaseAdminConfigured()) return { checked: false, ready: false, issueCount: 0, issues: [] };
  const admin = createAdminSupabaseClient();

  const { data: registrations, error } = await admin.from("business_registrations").select("id, business_name, plan_tier, status").eq("status", "pending").in("plan_tier", ["plus", "premium"]).order("created_at", { ascending: true });
  if (error || !registrations) return { checked: false, ready: false, issueCount: 0, issues: [] };
  if (registrations.length === 0) return { checked: true, ready: true, issueCount: 0, issues: [] };

  const { data: methods, error: methodsError } = await admin.from("billing_payment_methods").select("business_registration_id").in("business_registration_id", registrations.map((row) => row.id));
  if (methodsError) return { checked: false, ready: false, issueCount: 0, issues: [] };

  const issues = findLiveReadinessIssues(registrations, new Set((methods ?? []).map((row) => row.business_registration_id)));
  return { checked: true, ready: issues.length === 0, issueCount: issues.length, issues };
}

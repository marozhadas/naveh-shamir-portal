import "server-only";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { getBusinessListingAccess } from "@/domain/get-business-listing-access";
import { mapRegistrationToBusiness } from "@/utils/map-registration-to-business";
import { toBusinessId } from "@/utils/business-id";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import type { BusinessSubscription } from "@/types/subscription";
import type { BusinessListingAccess } from "@/types/business-listing-access";

export type AdminSubscriptionFilter = "all" | "no-subscription" | "trialing" | "active" | "expired" | "basic" | "plus" | "premium";

export const ADMIN_SUBSCRIPTION_FILTER_TABS: { value: AdminSubscriptionFilter; label: string }[] = [
  { value: "all", label: "כל סוגי המנוי" },
  { value: "no-subscription", label: "ללא מנוי" },
  { value: "trialing", label: "בתקופת ניסיון" },
  { value: "active", label: "מנוי פעיל" },
  { value: "expired", label: "ניסיון הסתיים" },
  { value: "basic", label: "כרטיס בסיסי" },
  { value: "plus", label: "כרטיס Plus" },
  { value: "premium", label: "כרטיס פרימיום" },
];

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  trialing: "בתקופת ניסיון",
  active: "מנוי פעיל",
  "past-due": "תשלום נכשל",
  canceled: "מנוי בוטל",
  expired: "ניסיון הסתיים",
  paused: "מנוי מושהה",
};

export type AdminSubscriptionSummary = {
  subscription: BusinessSubscription | null;
  access: BusinessListingAccess;
  daysRemaining: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Everything an admin needs to know about a registration's Basic/Plus/Premium state in one place —
 * the real subscription (fetched via the same repository the trial flow writes through, never a
 * direct table read) plus the derived access and days-remaining, so the admin UI never has to
 * re-derive tier logic itself. The admin CAN change the active tier directly — see
 * changeBusinessPlanAction ([id]/actions.ts) — but always through that single audited server
 * action, never by writing access/tier fields from the client.
 */
export async function getAdminSubscriptionSummary(registration: BusinessRegistrationRow, now: Date): Promise<AdminSubscriptionSummary> {
  const business = mapRegistrationToBusiness(registration);
  const subscription = await subscriptionRepository.getByBusinessId(toBusinessId(registration.id));
  const access = getBusinessListingAccess(business, subscription, now);
  const daysRemaining =
    subscription?.status === "trialing"
      ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - now.getTime()) / MS_PER_DAY))
      : null;
  return { subscription, access, daysRemaining };
}

export function matchesSubscriptionFilter(summary: AdminSubscriptionSummary, filter: AdminSubscriptionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "basic") return summary.access.tier === "basic";
  if (filter === "plus") return summary.access.tier === "plus";
  if (filter === "premium") return summary.access.tier === "premium";
  if (filter === "no-subscription") return summary.subscription === null;
  return summary.subscription?.status === filter;
}

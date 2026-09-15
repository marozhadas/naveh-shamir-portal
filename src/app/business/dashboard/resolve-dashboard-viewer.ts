import { authAdapter } from "@/adapters/mock-auth-adapter";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { getSubscriptionAccess } from "@/domain/get-subscription-access";
import { getBusinessSelfEditAccess } from "@/domain/get-business-self-edit-access";
import type { Business } from "@/types/business";
import type { AuthenticatedUser } from "@/types/auth";
import type { BusinessSubscription, SubscriptionAccess } from "@/types/subscription";
import type { BusinessSelfEditAccess } from "@/domain/get-business-self-edit-access";

export type DashboardView =
  | { kind: "signed-out" }
  | { kind: "no-business"; viewer: AuthenticatedUser }
  | {
      kind: "ready";
      viewer: AuthenticatedUser;
      business: Business;
      subscription: BusinessSubscription | null;
      access: SubscriptionAccess | null;
      selfEditAccess: BusinessSelfEditAccess;
    };

/**
 * Shared across every /business/dashboard/* page — resolves "who is this, what business do they
 * own, what can they currently do" exactly once per request, using the same demo-account
 * assumption (one business per owner) as the trial flow.
 */
export async function resolveDashboardViewer(): Promise<DashboardView> {
  const viewer = await authAdapter.getCurrentUser();
  if (!viewer) return { kind: "signed-out" };

  const businessId = viewer.ownedBusinessIds[0];
  if (!businessId) return { kind: "no-business", viewer };

  const business = await businessRepository.getDraftById(businessId, viewer.id);
  if (!business) return { kind: "no-business", viewer };

  const subscription = await subscriptionRepository.getByBusinessId(businessId);
  const now = new Date();
  const access = subscription ? getSubscriptionAccess(subscription, now) : null;
  const selfEditAccess = getBusinessSelfEditAccess({
    activePlanId: business.activePlanId ?? "basic",
    subscriptionAccess: access,
    lastSelfEditAt: business.lastSelfEditAt ?? null,
    now,
  });

  return { kind: "ready", viewer, business, subscription, access, selfEditAccess };
}

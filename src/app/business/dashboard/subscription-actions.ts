"use server";

import { revalidatePath } from "next/cache";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { paymentProviderAdapter } from "@/adapters/mock-payment-provider-adapter";

async function requireOwnedSubscription() {
  const user = await authAdapter.requireUser();
  const businessId = user.ownedBusinessIds[0];
  if (!businessId) throw new Error("No business is associated with this account.");
  const subscription = await subscriptionRepository.getByBusinessId(businessId);
  if (!subscription || subscription.ownerId !== user.id) {
    throw new Error("No subscription found for this business, or it doesn't belong to this account.");
  }
  return subscription;
}

/** Demo checkout: no real payment happens (see MockPaymentProviderAdapter) — this simulates a successful mock payment completing immediately, moving the subscription straight to "active". */
export async function startCheckoutAction(): Promise<void> {
  const subscription = await requireOwnedSubscription();
  await paymentProviderAdapter.createCheckoutSession({
    businessId: subscription.businessId,
    ownerId: subscription.ownerId,
    planId: subscription.planId,
  });
  await subscriptionRepository.updateStatus(subscription.id, "active");
  revalidatePath("/business/dashboard");
  revalidatePath("/business/dashboard/subscription");
}

/**
 * Sets status to "canceled" AND cancelAtPeriodEnd: true — both are needed: getSubscriptionAccess
 * and SubscriptionStatusCard branch on `status`, while `cancelAtPeriodEnd` (plus
 * currentPeriodEndsAt) is what keeps the business live until the already-paid period actually
 * ends (spec section 39). Nothing is deleted.
 */
export async function cancelSubscriptionAction(): Promise<void> {
  const subscription = await requireOwnedSubscription();
  await subscriptionRepository.updateStatus(subscription.id, "canceled");
  await subscriptionRepository.setCancelAtPeriodEnd(subscription.id, true);
  revalidatePath("/business/dashboard");
  revalidatePath("/business/dashboard/subscription");
}

/** Reverses a pending cancellation before the period ends — back to "active", cancelAtPeriodEnd: false. */
export async function reactivateSubscriptionAction(): Promise<void> {
  const subscription = await requireOwnedSubscription();
  await subscriptionRepository.updateStatus(subscription.id, "active");
  await subscriptionRepository.setCancelAtPeriodEnd(subscription.id, false);
  revalidatePath("/business/dashboard");
  revalidatePath("/business/dashboard/subscription");
}

"use server";

import { revalidatePath } from "next/cache";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { getSubscriptionAccess } from "@/domain/get-subscription-access";

/**
 * Draft -> pending-review only (never straight to "published"): spec section 5 treats an
 * explicit admin approval as a separate step, and there's no admin panel in this phase to
 * perform it, so a submitted business stays "pending-review" — visible to nobody but its owner
 * (and an admin, if one existed) until that review happens in a later phase.
 */
export async function submitForReviewAction(): Promise<void> {
  const user = await authAdapter.requireUser();
  const businessId = user.ownedBusinessIds[0];
  if (!businessId) throw new Error("No business is associated with this account.");

  const business = await businessRepository.getDraftById(businessId, user.id);
  if (!business) throw new Error("Business not found or not owned by this user.");
  if (business.status !== "draft") throw new Error("Only a draft business can be submitted for review.");

  const subscription = await subscriptionRepository.getByBusinessId(businessId);
  if (!subscription) throw new Error("Start a trial before submitting the business for review.");
  const access = getSubscriptionAccess(subscription, new Date());
  if (!access.canPublish) throw new Error("The current subscription doesn't allow publishing.");

  await businessRepository.setStatus(businessId, user.id, "pending-review");
  revalidatePath("/business/dashboard");
}

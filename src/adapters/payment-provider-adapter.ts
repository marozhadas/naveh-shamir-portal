import type { CheckoutSessionResult, CreateCheckoutSessionInput, CustomerPortalResult } from "@/types/payment";

/**
 * No real payment provider (Stripe or otherwise) is connected in this phase (spec section 33) —
 * this interface exists so a real implementation can be swapped in later without touching any
 * call site. Nothing implementing this interface may collect card details, store payment
 * credentials, or simulate a real charge (see mock-payment-provider-adapter.ts).
 */
export interface PaymentProviderAdapter {
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult>;
  createCustomerPortalSession(customerId: string): Promise<CustomerPortalResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}

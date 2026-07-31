import type { CheckoutSessionResult, CreateCheckoutSessionInput, CustomerPortalResult } from "@/types/payment";
import type { PaymentProviderAdapter } from "./payment-provider-adapter";

export const MOCK_PAYMENT_DISCLAIMER = "סביבת הדגמה — לא מתבצע חיוב אמיתי";

/**
 * Development-only. Collects nothing, charges nothing, stores no payment details — it exists
 * purely so the subscription-management UI has something real to call through
 * PaymentProviderAdapter instead of hardcoding "there is no payment yet" everywhere. Every result
 * it returns is labeled as a demo so it can never be mistaken for a real transaction.
 */
export class MockPaymentProviderAdapter implements PaymentProviderAdapter {
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult> {
    return { redirectUrl: `/business/dashboard/subscription?demo=checkout&businessId=${input.businessId}` };
  }

  async createCustomerPortalSession(): Promise<CustomerPortalResult> {
    return { redirectUrl: "/business/dashboard/subscription?demo=portal" };
  }

  async cancelSubscription(): Promise<void> {
    // No real provider call to make — the caller (Server Action) updates our own subscription
    // repository directly. This method exists only to satisfy the interface for a future
    // real-provider swap, where it WOULD call out to Stripe/etc.
  }
}

export const paymentProviderAdapter = new MockPaymentProviderAdapter();

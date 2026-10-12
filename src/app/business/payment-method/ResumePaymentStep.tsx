"use client";

import { useRouter } from "next/navigation";
import { PaymentMethodTrialForm } from "@/components/business-dashboard/PaymentMethodTrialForm/PaymentMethodTrialForm";

type ResumePaymentStepProps = {
  /** Found on the server from the signed-in owner (never from the URL); the server action checks ownership again. */
  registrationId: string;
  hostedFieldsKey: string;
  testMode: boolean;
  planTier: "plus" | "premium";
  /** Display only: "39 ₪ לחודש" - the real price is re-derived on the server from the stored plan. */
  priceLabel: string;
  amountValue: string;
  trialDays: number;
};

/**
 * Step 6 of the registration for an EXISTING pending registration: the very same Hosted Fields form (and server action) the
 * wizard uses. It only tokenizes and saves the card; the business stays pending until an admin approves it.
 */
export function ResumePaymentStep({ registrationId, hostedFieldsKey, testMode, planTier, priceLabel, amountValue, trialDays }: ResumePaymentStepProps) {
  const router = useRouter();
  return (
    <PaymentMethodTrialForm
      hostedFieldsKey={hostedFieldsKey}
      testMode={testMode}
      trialDays={trialDays}
      planName={planTier === "premium" ? "Premium" : "Plus"}
      priceLabel={priceLabel}
      amountValue={amountValue}
      registrationId={registrationId}
      onCompleted={() => router.push(`/business/register/success?plan=${planTier}&payment=saved`)}
    />
  );
}

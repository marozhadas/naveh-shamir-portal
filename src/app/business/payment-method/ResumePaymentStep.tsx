"use client";

import { useRouter } from "next/navigation";
import { SumitCardStep } from "@/components/business-dashboard/SumitCardForm/SumitCardStep";

type ResumePaymentStepProps = {
  /** Found on the server from the signed-in owner (never from the URL); the server action checks ownership again. */
  registrationId: string;
  /** The CompanyID and the PUBLIC key payments.js needs - never the API key. */
  companyId: number;
  apiPublicKey: string;
  planTier: "plus" | "premium";
};

/**
 * Step 6 of the registration for an EXISTING pending registration: the very same SUMIT card form (and server action) the wizard
 * uses. It only SAVES the card - no charge, no subscription, no trial; the business stays pending until an admin approves it.
 */
export function ResumePaymentStep({ registrationId, companyId, apiPublicKey, planTier }: ResumePaymentStepProps) {
  const router = useRouter();
  return <SumitCardStep companyId={companyId} apiPublicKey={apiPublicKey} registrationId={registrationId} onCompleted={() => router.push(`/business/register/success?plan=${planTier}&payment=saved`)} />;
}

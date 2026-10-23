/**
 * The "סטטוס חודש ניסיון" line of the admin business page.
 *
 * `business_registrations.trial_status` is only ever written at registration ("not-started") - no trial path updates it afterwards -
 * so for a business whose trial really started it contradicts the subscription section. For a SUMIT subscription the label is
 * therefore derived from the subscription row itself. Every other case (no subscription, a card-less trial, a PayMe subscription)
 * keeps showing the registration column exactly as before.
 */

export const TRIAL_STATUS_LABEL: Record<string, string> = { "not-started": "טרם הופעל", active: "פעיל", ended: "הסתיים" };

export function getAdminTrialStatusLabel(registrationTrialStatus: string, subscription: { payment_provider: string | null; status: string } | null): string {
  if (subscription?.payment_provider === "sumit") {
    return subscription.status === "trialing" ? `${TRIAL_STATUS_LABEL.active} (בתקופת ניסיון)` : TRIAL_STATUS_LABEL.ended;
  }
  return TRIAL_STATUS_LABEL[registrationTrialStatus] ?? registrationTrialStatus;
}

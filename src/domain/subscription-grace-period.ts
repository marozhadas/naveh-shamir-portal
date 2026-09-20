export const GRACE_PERIOD_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure helper for the future billing integration: given the moment a REAL charge failed, returns
 * when the 7-day grace period ends. Nothing in the app calls this yet — there is no payment
 * provider, so no billing failure can occur, and no code may simulate one or create a grace period
 * without a real failure event.
 */
export function computeGracePeriodEnd(paymentFailedAt: Date): Date {
  return new Date(paymentFailedAt.getTime() + GRACE_PERIOD_DAYS * MS_PER_DAY);
}

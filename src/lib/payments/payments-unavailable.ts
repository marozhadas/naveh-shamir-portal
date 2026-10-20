/**
 * The safe, explicit state for any flow that needs a payment provider while none is connected: SUMIT is the only provider
 * and its payment form is not live yet, and PayMe is dormant and never a fallback. A flow that would need a card /
 * a charge / a subscription answers with this instead of silently using something else. No card is collected, nothing is charged.
 */
export const PAYMENTS_TEMPORARILY_UNAVAILABLE = "payments_temporarily_unavailable" as const;

/** User-facing Hebrew text (also safe for the admin). */
export const PAYMENTS_TEMPORARILY_UNAVAILABLE_MESSAGE = "הסליקה אינה זמינה כרגע. לא בוצע חיוב. נסו שוב מאוחר יותר.";

export type CreateCheckoutSessionInput = {
  businessId: string;
  ownerId: string;
  planId: string;
};

export type CheckoutSessionResult = {
  /** Where to send the owner to complete checkout. The mock provider points back at our own subscription page with a demo flag — a real provider would return its own hosted checkout URL. */
  redirectUrl: string;
};

export type CustomerPortalResult = {
  redirectUrl: string;
};

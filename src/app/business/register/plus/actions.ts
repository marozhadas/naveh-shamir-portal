"use server";

import { submitBusinessRegistration, type BusinessRegistrationActionState } from "../actions";

/** Same validation/insert path as the free plan, tagged plan_tier: "plus" — see submitBusinessRegistration. */
export async function registerPlusBusinessAction(
  _prevState: BusinessRegistrationActionState,
  formData: FormData,
): Promise<BusinessRegistrationActionState> {
  return submitBusinessRegistration(formData, "plus");
}

// A MOCK of src/app/business/dashboard/sumit-payment-actions.ts for the browser harness (the real module is replaced by an alias).
// It records the SHAPE of what the form sends - key names and booleans, never a card value - and answers as the scenario says.
import { harness } from "./harness-state";

type Input = { registrationId: string; token: string; payer: { firstName: string; lastName: string; email: string; phone: string }; consent: boolean };
type State = { status: "idle" | "error" | "success"; message?: string; code?: string };

export async function saveSumitPaymentMethodForRegistrationAction(input: Input): Promise<State> {
  const h = harness();
  const text = JSON.stringify(input);
  const payerText = JSON.stringify(input.payer ?? {});
  h.actionCalls.push({
    topKeys: Object.keys(input).sort(),
    payerKeys: Object.keys(input.payer ?? {}).sort(),
    tokenWasProducedByTheMock: h.producedTokens.includes(input.token),
    anyDigitRunOfTwelveOrMore: /\d{12,}/.test(payerText.replace(/[ -]/g, "")), // the payer fields only (the mock token and id are all digits)
    containsTheTypedCardOrCvv: /5326|0772|1073/.test(text.replace(/[ -]/g, "")),
    consent: input.consent,
    registrationIdShape: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.registrationId),
  });
  if (h.actionMode === "throw") throw new Error("network down (mock)");
  if (h.actionMode === "slow") await new Promise((resolve) => window.setTimeout(resolve, 1500));
  if (h.actionMode === "error") return { status: "error", message: "לא הצלחנו לשמור את אמצעי התשלום (הודעת בדיקה). לא בוצע חיוב." };
  return { status: "success" };
}

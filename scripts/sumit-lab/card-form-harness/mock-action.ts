// A MOCK of src/app/business/dashboard/sumit-payment-actions.ts for the browser harness (the real module is replaced by an alias).
// It records the SHAPE of what the form sends - key names and booleans, never a card value - and answers as the scenario says.
import { harness } from "./harness-state";

type Input = { registrationId: string; token: string; payer: { firstName: string; lastName: string; email: string; phone: string }; consent: boolean };
type State = { status: "idle" | "error" | "success"; message?: string; code?: string };

// the mocked read-only check: has the card of this registration been saved? (answers from the mocked server's memory)
export async function getSumitCardSavedStatusAction(input: { registrationId: string }): Promise<{ status: "saved" | "not-saved" | "error" }> {
  const h = harness();
  h.savedCheckCalls += 1;
  if (h.savedCheckMode === "throw") throw new Error("network down (mock)");
  if (h.savedCheckMode === "error" || !input?.registrationId) return { status: "error" };
  return { status: h.cardSaved ? "saved" : "not-saved" };
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function saveSumitPaymentMethodForRegistrationAction(input: Input): Promise<State> {
  const h = harness();
  const text = JSON.stringify(input);
  const payerText = JSON.stringify(input.payer ?? {});
  if (typeof input.token === "string") h.actionTokenHashes.push(await sha256(input.token));
  h.actionCalls.push({
    tokenLooksLikeUuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(input.token)),
    topKeys: Object.keys(input).sort(),
    payerKeys: Object.keys(input.payer ?? {}).sort(),
    tokenWasProducedByTheMock: h.producedTokens.includes(input.token),
    anyDigitRunOfTwelveOrMore: /\d{12,}/.test(payerText.replace(/[ -]/g, "")), // the payer fields only (the mock token and id are all digits)
    containsTheTypedCardOrCvv: /5326|0772|1073/.test(text.replace(/[ -]/g, "")),
    consent: input.consent,
    registrationIdShape: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.registrationId),
  });
  if (h.actionMode === "throw") throw new Error("network down (mock)");
  if (h.actionMode === "slow") {
    // 1.5 s that a hidden (background) tab cannot stretch: a MessageChannel ping-pong is not throttled like a timer
    await new Promise<void>((resolve) => {
      const end = performance.now() + 1500;
      const channel = new MessageChannel();
      channel.port1.onmessage = () => (performance.now() >= end ? resolve() : channel.port2.postMessage(0));
      channel.port2.postMessage(0);
    });
  }
  if (h.actionMode === "error") return { status: "error", message: "לא הצלחנו לשמור את אמצעי התשלום (הודעת בדיקה). לא בוצע חיוב." };
  h.cardSaved = true; // the mocked server saved the card (even if the page that asked is already gone)
  return { status: "success" };
}

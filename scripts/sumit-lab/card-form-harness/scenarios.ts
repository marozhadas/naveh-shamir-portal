import { harness } from "./harness-state";

/**
 * The browser scenarios for the REAL SumitCardForm, runnable in the harness page: `await window.__runScenarios()` returns
 * [{ name, pass }] and the first failing check is the first `pass: false`. Mocks only (payments.js stand-in, server action).
 */
type Helpers = {
  fill: (withCard?: boolean, withConsent?: boolean) => void;
  typeCard: () => void;
  button: () => HTMLButtonElement | undefined;
  cardLengths: () => Record<string, number>;
  errorText: () => string | null;
  ogTokenLength: () => number | null;
  sleep: (ms: number) => Promise<unknown>;
};
const helpers = () => (window as unknown as { __t: Helpers }).__t;

export async function runScenarios(): Promise<Array<{ name: string; pass: boolean; detail?: unknown }>> {
  const h = harness();
  const t = helpers();
  const results: Array<{ name: string; pass: boolean; detail?: unknown }> = [];
  const check = (name: string, pass: boolean, detail?: unknown) => results.push(pass ? { name, pass } : { name, pass, detail });

  async function fresh() {
    h.unmount();
    await t.sleep(50);
    h.createTokenCalls.length = 0;
    h.actionCalls.length = 0;
    h.pending.length = 0;
    h.completed = 0;
    h.scenario = "ok";
    h.actionMode = "success";
    h.mount();
    await t.sleep(700);
  }
  const click = () => t.button()!.click();

  // 1. success + double click + Enter: ONE attempt, ONE save, only the allowed keys, no card in the action, card wiped
  await fresh();
  t.fill();
  await t.sleep(50);
  click();
  click();
  (document.getElementById("sumit-card-form") as HTMLFormElement).requestSubmit();
  await t.sleep(900);
  const action = h.actionCalls[0];
  check("success: one tokenization for a double click plus a submit", h.createTokenCalls.length === 1, h.createTokenCalls.length);
  check("success: the card fields were normalized for payments.js (16 digits, MM, YYYY, 3)", JSON.stringify(h.createTokenCalls[0]?.cardLengths) === JSON.stringify({ number: 16, month: 2, year: 4, cvv: 3 }), h.createTokenCalls[0]?.cardLengths);
  check("success: exactly one save and one completion", h.actionCalls.length === 1 && h.completed === 1, { actions: h.actionCalls.length, completed: h.completed });
  check("success: the action got only registrationId, token, payer, consent", JSON.stringify(action?.topKeys) === JSON.stringify(["consent", "payer", "registrationId", "token"]) && JSON.stringify(action?.payerKeys) === JSON.stringify(["email", "firstName", "lastName", "phone"]), action);
  check("success: no card number, expiry or CVV in what the action received", action?.containsTheTypedCardOrCvv === false && action?.anyDigitRunOfTwelveOrMore === false, action);
  check("success: the token is the one payments.js produced", action?.tokenWasProducedByTheMock === true);
  check("success: the card inputs and the hidden token field are empty afterwards", Object.values(t.cardLengths()).every((n) => n === 0) && t.ogTokenLength() === 0, t.cardLengths());
  check("success: no request left the page for any other host", performance.getEntriesByType("resource").every((entry) => new URL(entry.name).host === location.host));

  // 2. the server action fails -> message, card wiped, no completion; the SECOND attempt works
  await fresh();
  h.actionMode = "error";
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(700);
  check("action error: a Hebrew message that asks to re-enter the card, no completion", /הזינו שוב את פרטי הכרטיס/.test(t.errorText() ?? "") && h.completed === 0, t.errorText());
  check("action error: the card was wiped and the button is usable again", Object.values(t.cardLengths()).every((n) => n === 0) && t.button()!.disabled === false);
  h.actionMode = "success";
  t.typeCard();
  await t.sleep(50);
  click();
  await t.sleep(700);
  check("retry after an action error: a new tokenization (hidden field empty before it) and ONE completion", h.createTokenCalls.length === 2 && h.createTokenCalls[1].ogTokenLengthBefore === 0 && h.actionCalls.length === 2 && h.completed === 1, { calls: h.createTokenCalls.length, completed: h.completed });

  // 3. the server action THROWS (network) -> communication message, then a retry works
  await fresh();
  h.actionMode = "throw";
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(700);
  check("action throws: communication message, no completion, button usable", /תקשורת/.test(t.errorText() ?? "") && h.completed === 0 && t.button()!.disabled === false, t.errorText());

  // 4. payments.js refuses the card (Status 1): our own message, never SUMIT's text, no save, card kept for a fix
  await fresh();
  h.scenario = "refused";
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(600);
  check("refused: our own Hebrew message, SUMIT's text never shown", /פרטי הכרטיס לא התקבלו/.test(t.errorText() ?? "") && !(t.errorText() ?? "").includes("raw SUMIT"), t.errorText());
  check("refused: nothing saved, card kept so it can be corrected", h.actionCalls.length === 0 && t.cardLengths().number === 16, t.cardLengths());

  // 5. payments.js answers TWICE (the real script has no guard): still one save
  await fresh();
  h.scenario = "twice";
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(700);
  check("double answer from payments.js: one save, one completion", h.actionCalls.length === 1 && h.completed === 1, { actions: h.actionCalls.length, completed: h.completed });

  // 6. TIMEOUT (20 s shortened to 300 ms by the harness): message, then a LATE valid answer must not save; a retry saves once; the late answer again changes nothing
  await fresh();
  h.scenario = "silent";
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(60);
  check("timeout: while waiting the button is disabled", t.button()!.disabled === true);
  await t.sleep(700);
  check("timeout: communication message, button usable again, card kept", /תקשורת/.test(t.errorText() ?? "") && t.button()!.disabled === false && t.cardLengths().number === 16, t.errorText());
  h.answerLate(1);
  await t.sleep(300);
  check("LATE answer after the timeout: no save, no completion, the message is unchanged", h.actionCalls.length === 0 && h.completed === 0 && /תקשורת/.test(t.errorText() ?? ""), { actions: h.actionCalls.length });
  h.scenario = "ok";
  click();
  await t.sleep(700);
  check("retry after a timeout: its hidden field was emptied first, exactly one save", h.createTokenCalls[1]?.ogTokenLengthBefore === 0 && h.actionCalls.length === 1 && h.completed === 1, { calls: h.createTokenCalls.length, actions: h.actionCalls.length });
  h.answerLate(1);
  await t.sleep(300);
  check("the first attempt answers AGAIN after the retry completed: still one save", h.actionCalls.length === 1 && h.completed === 1);

  // 7. the form is REMOVED while payments.js has not answered: the late answer must not save, not even after the timeout window
  await fresh();
  h.scenario = "silent";
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(60);
  h.unmount();
  await t.sleep(50);
  h.answerLate(1);
  await t.sleep(400);
  check("removed form + late answer: no save, no completion", h.actionCalls.length === 0 && h.completed === 0, { actions: h.actionCalls.length });
  await t.sleep(600);
  check("removed form: still nothing after the timeout window", h.actionCalls.length === 0 && h.completed === 0);
  h.scenario = "ok";
  h.mount();
  await t.sleep(700);
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(700);
  check("a re-mounted form saves exactly once", h.actionCalls.length === 1 && h.completed === 1);
  h.answerLate(1);
  await t.sleep(300);
  check("the removed form's old callback again, on the new form: still one save", h.actionCalls.length === 1 && h.completed === 1);

  // 8. the form is removed while the SAVE is in flight: no completion / navigation afterwards
  await fresh();
  h.actionMode = "slow";
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(400);
  check("slow save: the action is running", h.actionCalls.length === 1);
  h.unmount();
  await t.sleep(1800);
  check("removed during the save: no completion, no second save", h.completed === 0 && h.actionCalls.length === 1, { completed: h.completed });

  // 9. browser-side validation sends nothing
  await fresh();
  click();
  await t.sleep(100);
  t.fill(false, false);
  await t.sleep(50);
  click();
  await t.sleep(100);
  t.fill(true, true);
  (document.querySelector("#sumit-card-cvv") as HTMLInputElement).value = "1";
  click();
  await t.sleep(100);
  (document.querySelector("#sumit-card-cvv") as HTMLInputElement).value = "033";
  (document.querySelector("#sumit-card-year") as HTMLInputElement).value = "2020";
  click();
  await t.sleep(100);
  check("validation: empty form, no consent, bad CVV, past expiry - nothing is tokenized or saved", h.createTokenCalls.length === 0 && h.actionCalls.length === 0 && h.completed === 0, { calls: h.createTokenCalls.length });

  // 10. jQuery came from the bundle, and only window.jQuery was set
  check("jQuery is loaded by the form (window.jQuery) and window.$ is not touched", typeof (window as unknown as { jQuery?: unknown }).jQuery === "function" && (window as unknown as { $?: unknown }).$ === undefined);
  return results;
}

(window as unknown as { __runScenarios: typeof runScenarios }).__runScenarios = runScenarios;

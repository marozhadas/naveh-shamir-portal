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
    h.cardSaved = false;
    h.savedCheckMode = "normal";
    h.savedCheckCalls = 0;
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

  // 10. coming back after the card was ALREADY saved on the server: identified, no form, nothing is saved again
  await fresh();
  h.cardSaved = true;
  h.unmount();
  h.mount();
  await t.sleep(700);
  check("already saved: the form is not shown, a notice says it is saved", !document.getElementById("sumit-card-form") && /כבר נשמר/.test(document.body.textContent ?? ""), document.body.textContent?.slice(0, 80));
  check("already saved: nothing is tokenized or saved by itself", h.createTokenCalls.length === 0 && h.actionCalls.length === 0 && h.completed === 0);
  const continueButton = [...document.querySelectorAll("button")].find((b) => b.textContent === "המשך");
  continueButton?.click();
  await t.sleep(100);
  check("already saved: 'continue' completes the step without a save", h.completed === 1 && h.actionCalls.length === 0 && h.createTokenCalls.length === 0);

  // 11. a normal save, then the owner comes back to the screen: saved is identified and the form does not return
  await fresh();
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(700);
  check("save finished on the server", h.cardSaved === true && h.actionCalls.length === 1 && h.completed === 1);
  h.unmount();
  h.mount();
  await t.sleep(700);
  check("coming back after a finished save: 'already saved', no form, no second save", !document.getElementById("sumit-card-form") && /כבר נשמר/.test(document.body.textContent ?? "") && h.actionCalls.length === 1 && h.createTokenCalls.length === 1, { actions: h.actionCalls.length });

  // 12. the page was left while the save was still running; the server finished it; coming back identifies it - no automatic second save
  await fresh();
  h.actionMode = "slow";
  t.fill();
  await t.sleep(50);
  click();
  await t.sleep(400);
  h.unmount();
  await t.sleep(1800);
  check("the server finished the save after the page was left", h.cardSaved === true && h.actionCalls.length === 1 && h.completed === 0);
  h.mount();
  await t.sleep(700);
  check("coming back: identified as saved, no form, still exactly one save", !document.getElementById("sumit-card-form") && /כבר נשמר/.test(document.body.textContent ?? "") && h.actionCalls.length === 1 && h.createTokenCalls.length === 1, { actions: h.actionCalls.length });

  // 13. not saved -> the form ONLY on that explicit answer; a failing check -> a message and "try again", NEVER the form
  await fresh();
  check("not saved: the form is shown after the read-only check (React strict mode may run it twice in development)", !!document.getElementById("sumit-card-form") && h.savedCheckCalls >= 1 && !/כבר נשמר/.test(document.body.textContent ?? ""));
  const retryButton = () => [...document.querySelectorAll("button")].find((b) => b.textContent === "נסה שוב");
  const unknownShown = () => !document.getElementById("sumit-card-form") && /לא הצלחנו לבדוק אם אמצעי תשלום כבר נשמר/.test(document.body.textContent ?? "") && !!retryButton() && !/אמצעי התשלום כבר נשמר/.test(document.body.textContent ?? "");
  for (const mode of ["error", "throw"] as const) {
    h.unmount();
    h.savedCheckMode = mode;
    h.mount();
    await t.sleep(700);
    check("the check says " + mode + ": a message and 'try again' - NO form, no 'already saved' claim", unknownShown(), document.body.textContent?.slice(0, 120));
    check("the check says " + mode + ": nothing is tokenized, saved or completed", h.createTokenCalls.length === 0 && h.actionCalls.length === 0 && h.completed === 0);
  }
  // 'try again' runs one more check; while it keeps failing the form stays away
  const callsBeforeRetry = h.savedCheckCalls;
  retryButton()?.click();
  await t.sleep(500);
  check("'try again' while the check still fails: another read-only check ran and still no form", h.savedCheckCalls === callsBeforeRetry + 1 && unknownShown(), { before: callsBeforeRetry, after: h.savedCheckCalls });
  // the check recovers with an explicit not-saved -> now (and only now) the form appears
  h.savedCheckMode = "normal";
  retryButton()?.click();
  await t.sleep(500);
  check("'try again' answered not-saved: the form appears", !!document.getElementById("sumit-card-form") && !retryButton());
  // the check recovers and the card WAS saved meanwhile -> 'already saved', no form
  h.unmount();
  h.savedCheckMode = "error";
  h.cardSaved = true;
  h.mount();
  await t.sleep(700);
  h.savedCheckMode = "normal";
  retryButton()?.click();
  await t.sleep(500);
  check("'try again' answered saved: 'already saved', no form, no save", !document.getElementById("sumit-card-form") && /אמצעי התשלום כבר נשמר/.test(document.body.textContent ?? "") && h.actionCalls.length === 0 && h.createTokenCalls.length === 0);
  // a slow/failed check never lets a form appear in between: while checking there is no form either
  h.unmount();
  h.cardSaved = false;
  h.savedCheckMode = "normal";
  h.mount();
  check("while the check is running there is no form", !document.getElementById("sumit-card-form"));
  await t.sleep(700);

  // 14. no card-brand marks, and the provider named is SUMIT
  await fresh();
  check("no card-brand marks are shown", document.querySelectorAll("svg[aria-label='Visa'], svg[aria-label='Mastercard'], svg[aria-label='American Express'], svg[aria-label='ישראכרט']").length === 0);
  check("the trust line names SUMIT, not PayMe", /באמצעות SUMIT/.test(document.body.textContent ?? "") && !/PayMe/.test(document.body.textContent ?? ""));

  // 15. jQuery came from the bundle, and only window.jQuery was set
  check("jQuery is loaded by the form (window.jQuery) and window.$ is not touched", typeof (window as unknown as { jQuery?: unknown }).jQuery === "function" && (window as unknown as { $?: unknown }).$ === undefined);
  return results;
}

(window as unknown as { __runScenarios: typeof runScenarios }).__runScenarios = runScenarios;

/**
 * REAL mode (page opened with ?real=1): the real SumitCardForm with SUMIT's REAL payments.js against the TEST organization, a
 * documented test card, and the MOCKED server action. One tokenization only. Nothing is saved, nothing is charged: the action is a
 * mock. The token is never printed or stored - only its SHA-256 is compared between SUMIT's answer and what the action received.
 */
const DOCUMENTED_TEST_CARD = { number: "5326107300020772", month: "05", year: "2031", cvv: "033" }; // SUMIT's recommended documented test card (help article 5832877)

export async function runRealScenario(): Promise<Array<{ name: string; pass: boolean; detail?: unknown }>> {
  const h = harness();
  const t = helpers();
  const results: Array<{ name: string; pass: boolean; detail?: unknown }> = [];
  const check = (name: string, pass: boolean, detail?: unknown) => results.push(pass ? { name, pass } : { name, pass, detail });
  const q = (selector: string) => document.querySelector(selector) as HTMLInputElement;

  check("real mode: the page was opened with ?real=1 and has the test organization's config", h.realProps !== null && typeof h.realProps.companyId === "number" && typeof h.realProps.apiPublicKey === "string");
  // wait for the form to be ready: jQuery from the bundle + SUMIT's real script loaded
  for (let i = 0; i < 60 && !(document.getElementById("sumit-card-form") && t.button() && t.button()!.disabled === false); i += 1) await t.sleep(250);
  check("the real payments.js was loaded by the form (OfficeGuy.Payments.CreateToken exists)", typeof (window as unknown as { OfficeGuy?: { Payments?: { CreateToken?: unknown } } }).OfficeGuy?.Payments?.CreateToken === "function");
  check("the form is ready (button enabled)", !!t.button() && t.button()!.disabled === false);

  t.fill(false, true);
  q("#sumit-card-number").value = DOCUMENTED_TEST_CARD.number.replace(/(\d{4})/g, "$1 ").trim();
  q("#sumit-card-month").value = String(Number(DOCUMENTED_TEST_CARD.month));
  q("#sumit-card-year").value = DOCUMENTED_TEST_CARD.year.slice(2);
  q("#sumit-card-cvv").value = DOCUMENTED_TEST_CARD.cvv;
  await t.sleep(50);
  const button = t.button()!;
  button.click();
  button.click(); // a double click, against the REAL script (which has no guard of its own)
  (document.getElementById("sumit-card-form") as HTMLFormElement).requestSubmit();
  for (let i = 0; i < 60 && h.completed === 0; i += 1) await t.sleep(250);
  await t.sleep(500);

  const tokenizeCalls = h.realXhr.filter((entry) => /tokenizesingleuse/.test(entry.path));
  const action = h.actionCalls[0];
  check("exactly ONE tokenization request went to SUMIT (double click + submit)", tokenizeCalls.length === 1 && tokenizeCalls[0].host === "api.sumit.co.il" && tokenizeCalls[0].status === 200, tokenizeCalls);
  check("the token reached the mocked action exactly once", h.actionCalls.length === 1, h.actionCalls.length);
  check("the token the action got is the one SUMIT's answer carried (hash equality) and it is uuid-shaped", h.realTokenHashes.length === 1 && h.actionTokenHashes.length === 1 && h.realTokenHashes[0] === h.actionTokenHashes[0] && action?.tokenLooksLikeUuid === true, { real: h.realTokenHashes.length, action: h.actionTokenHashes.length });
  check("the action received only registrationId, token, payer, consent - no card data", JSON.stringify(action?.topKeys) === JSON.stringify(["consent", "payer", "registrationId", "token"]) && action?.containsTheTypedCardOrCvv === false && action?.anyDigitRunOfTwelveOrMore === false, action);
  check("the step completed once", h.completed === 1, h.completed);
  check("the card inputs and the hidden og-token field are empty afterwards", Object.values(t.cardLengths()).every((n) => n === 0) && t.ogTokenLength() === 0, t.cardLengths());
  const hosts = [...new Set(performance.getEntriesByType("resource").map((entry) => new URL(entry.name).host))];
  check("the page talked only to this local server, app.sumit.co.il (the script) and api.sumit.co.il (the token)", hosts.every((host) => host === location.host || host === "app.sumit.co.il" || host === "api.sumit.co.il"), hosts);
  check("no request went to any other SUMIT endpoint (no customer, no card saved, no charge)", h.realXhr.every((entry) => /tokenizesingleuse/.test(entry.path)), h.realXhr.map((entry) => entry.path));
  return results;
}
(window as unknown as { __runRealScenario: typeof runRealScenario }).__runRealScenario = runRealScenario;

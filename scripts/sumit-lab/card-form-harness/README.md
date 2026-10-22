# SumitCardForm browser harness (mocks only)

Runs the REAL `SumitCardForm` component (and its helpers, React and the bundled jQuery) in a browser, with two things mocked: SUMIT's `payments.js` tokenization (`main.tsx`) and the server action (`mock-action.ts`, swapped in with an alias). No SUMIT call, no Supabase, no environment file, no key.

```bash
node scripts/sumit-lab/card-form-harness/server.mjs
```

Open the printed `http://127.0.0.1:4179/` and run, in the page's console:

```js
await window.__runScenarios()   // [{ name, pass }] - 46 checks, see scenarios.ts
```

Scenarios: success with a double click and a submit (one attempt, one save, only `registrationId`/`token`/`payer`/`consent` sent, no card data in what the action received, card wiped), server-action error and throw followed by a retry, payments.js refusal, a double answer, the timeout (its 20 s is shortened to 300 ms by the harness) followed by a LATE valid answer and a retry, removal of the form before payments.js answers (a late answer must not save), removal during the save, browser-side validation, and jQuery loading.

Also covered: coming back to step 6 after the card was already saved on the server (a normal save, or a save that finished after the page was left): the wrapper identifies "already saved", shows no form and starts no save; a failing check (error answer or failed call) shows a message and "try again" - NEVER the form, and never claims "saved"; the form appears only on an explicit not-saved; no card-brand marks are shown.

## Real payments.js against the TEST organization (server action still a mock)

```bash
HARNESS_REAL=1 node scripts/sumit-lab/card-form-harness/server.mjs
```

Open `http://127.0.0.1:4179/?real=1` and run `await window.__runRealScenario()` (11 checks). The server refuses to start unless `SUMIT_ENVIRONMENT=test` and `SUMIT_COMPANY_ID` equals `SUMIT_TEST_COMPANY_ID`; it serves only the CompanyID and the PUBLIC key to 127.0.0.1 and prints no value. One documented test card is typed, with a double click and a submit, so exactly ONE tokenization goes to SUMIT. The token is never printed or stored: only the SHA-256 of the token in SUMIT's answer is compared with the SHA-256 of the token the mocked action received. No customer is created, no card is saved, nothing is charged. In real mode the form's real 20 s timeout applies (the shortened one is for the mock mode only).

The checks were verified to be able to fail: with the guards removed from the component, the five "removed form" checks fail.

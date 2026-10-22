# SumitCardForm browser harness (mocks only)

Runs the REAL `SumitCardForm` component (and its helpers, React and the bundled jQuery) in a browser, with two things mocked: SUMIT's `payments.js` tokenization (`main.tsx`) and the server action (`mock-action.ts`, swapped in with an alias). No SUMIT call, no Supabase, no environment file, no key.

```bash
node scripts/sumit-lab/card-form-harness/server.mjs
```

Open the printed `http://127.0.0.1:4179/` and run, in the page's console:

```js
await window.__runScenarios()   // [{ name, pass }] - 28 checks, see scenarios.ts
```

Scenarios: success with a double click and a submit (one attempt, one save, only `registrationId`/`token`/`payer`/`consent` sent, no card data in what the action received, card wiped), server-action error and throw followed by a retry, payments.js refusal, a double answer, the timeout (its 20 s is shortened to 300 ms by the harness) followed by a LATE valid answer and a retry, removal of the form before payments.js answers (a late answer must not save), removal during the save, browser-side validation, and jQuery loading.

The checks were verified to be able to fail: with the guards removed from the component, the five "removed form" checks fail.

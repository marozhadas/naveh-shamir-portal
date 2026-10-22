# payments.js prototype (local, test organization only)

Observes how SUMIT's `payments.js` really behaves in a browser (jQuery dependency, callbacks, double submission, failure modes). Results are in `docs/sumit-verification.md`, section E.

```bash
node scripts/sumit-lab/payments-js-prototype/server.mjs
```

Open the printed `http://127.0.0.1:4178/` (add `?jq=0` to load the page without jQuery). In the page's console: `await window.tests.oneToken()`, `doubleCall()`, `expiredCard()`, `networkFailure()`, `bindFlow()`, `bindFlowNoCallback()`, `noJquery()` (on `?jq=0`). Results are also in `window.__results`.

- It refuses to start unless `SUMIT_ENVIRONMENT=test` and `SUMIT_COMPANY_ID` equals `SUMIT_TEST_COMPANY_ID`.
- It reads only `SUMIT_*` and `PAYMENTS_PROVIDER` from `.env.local`, prints no value, listens on 127.0.0.1 only and checks the Host header.
- Only SUMIT's documented test cards are ever filled in. The page and its results hold no card number, no token and no key: only shapes (length, uuid-like), counts and statuses. `/sink` records field NAMES only.
- No database and no Supabase code. Every tokenization call counts against the test organization's monthly API budget (about 400).

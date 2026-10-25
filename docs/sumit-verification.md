# SUMIT - what is verified, what support said, and what still waits for a test

Rule used here: only SUMIT's OWN statements count. Three buckets, never mixed:

- **A. Explicitly confirmed by SUMIT support** (reply of 2026-10-22) - may be relied on.
- **B. Hedged / partial answers** - NOT a basis for changing the code.
- **C. Pending a test in the TEST organization** - or unanswered. The code keeps its conservative handling until a test gives enough evidence.

Sources: the official OpenAPI (`https://api.sumit.co.il/swagger/v1/swagger.json`, vendored as property names in
`src/lib/sumit/__fixtures__/sumit-api-contract.json` - field NAMES only, it proves no business behaviour), https://app.sumit.co.il/developers/api/,
and the help-center articles [5893615 payments.js](https://help.sumit.co.il/he/articles/5893615), [5840939 testing](https://help.sumit.co.il/he/articles/5840939),
[15291230 test configuration](https://help.sumit.co.il/he/articles/15291230), [5832877 test cards](https://help.sumit.co.il/he/articles/5832877),
[5833033 charging with the API](https://help.sumit.co.il/he/articles/5833033), [5792403 saved cards](https://help.sumit.co.il/he/articles/5792403).

## A. Explicitly confirmed by SUMIT support

| Topic | What support said | Effect on the code |
|---|---|---|
| Saving a payment method takes no credit frame | "הפעולה רק שומרת את הפרטים בלי שמירת מסגרת" | `setforcustomer` is a save, not an authorisation. (Whether it also VALIDATES the card is not said - see C.) |
| A new card becomes the active card | "כן אם תבצעי שמירת טוקן חדש כשיש כרטיס, הכרטיס החדש יעודכן להיות הכרטיס הפעיל" | Replacing a card = one more `setforcustomer`. To be observed in the test. |
| A saved card is charged without sending the card again | "כן אין צורך להעביר שוב את פרטי האשראי" | The `charge` request carries only the customer and the items (already what the code sends). |
| payments.js is supported with UPAY | "כן נתמך במסגרת השימוש ב-UPAY" | The approval question (old Q9) is answered. The card fields still sit in our page, so our own PCI duties remain (SUMIT's article). |
| Amount fields are decimals | `UnitPrice` and `Total` are `double` and accept decimals; the unit price is per product and the total is quantity x unit price | Documents the item-level meaning only. **It does not say how `Payment.Amount`, VAT or `Currency` behave** - see C. |
| How to check that a save succeeded | In the SUMIT UI the customer card shows an active card ending in the same four digits | Used by the lab (last-four comparison + the UI check). |
| Scope of support | SUMIT does not explain schemas/responses; it recommends trying every case in a test organization. `Try it out` in the API docs RUNS the operation for real, also from the UI | All behaviour questions go to the test organization. |

## B. Hedged or partial answers (not a basis for changes)

| Topic | The answer | Why it is not enough |
|---|---|---|
| Token validity and re-use | "אין לטוקן תוקף **למיטב ידיעתי** וניתן להשתמש בו כל הזמן בלי הגבלה" | Hedged ("to my knowledge"). The code keeps treating the `SingleUseToken` as single-use: used once, never stored, never reused. Nothing changes until SUMIT states it in writing or a test shows it. |
| A null token | "תתקבל שגיאה, תבדקי בארגון בדיקות" | Expectation only. The lab observes the real answer (`null-token`). |
| Idempotency | "אני לא מכירה שיש מזהה ייחודי בקריאה עצמה", with a link to the payment-page parameters (article 5836159) | **No idempotency mechanism is confirmed for `payments/charge`.** That article is about payment PAGES; a link to it is NOT evidence that those parameters are supported by `payments/charge`. So: no automatic retry of an uncertain result, ever (proved by `src/lib/sumit/no-retry.test.ts`). |
| Other charge behaviours of a saved card | "לגבי השאר תצטרכי לבדוק בארגון בדיקות" | CVV exemption in the default setup, `PreventStandingOrder`, `MerchantNumber`: untested (and the test organization has no UPAY). |

## C. Pending a test in the test organization / no answer

| # | Open question | How it will be examined |
|---|---|---|
| 1 | What `BusinessError` means on `payments/charge`; whether `ValidPayment: false` means nothing was captured; the values of `Payment.Status` | One good result proves nothing. Observed in the lab; **the app stays conservative** (BusinessError throws `rejected`; `ValidPayment:false` is `unconfirmed`; no `failed` outcome exists) until there is enough evidence. |
| 2 | How to tell an authorise-only payment from a captured one on `get` / `list`; whether a hold remains | Lab step `authorise-only` (field-level comparison of `charge` / `get` / `list`). |
| 3 | `Payment.Amount` unit and VAT, `Currency` format; document (type, VAT line) | **Partly observed (D4-D6):** with `VATIncluded = true`, 39 NIS total incl. VAT, `Currency = 0` = NIS, in the test organization. Still open: `VATIncluded = false` (lab step `charge-vat-false`, approval needed) and production defaults. With VATIncluded=false a captured payment is `unconfirmed` anyway. |
| 4 | Does `setforcustomer` validate the card or only store it (support: "only saves the details"); behaviour of an invalid / used token | Lab steps `save-card`, `null-token`. |
| 5 | UPAY CVV exemption on a saved-card charge; effect of `PreventStandingOrder` / `MerchantNumber` | **Cannot be tested in the test organization** (no UPAY there). Needs SUMIT's written answer or a deliberate, separately approved first production charge. |
| 6 | Default `DocumentType`; `DocumentID` for a draft document; `SendDocumentByEmail` needing an email on the customer | **Partly observed (D5, D7):** a tax invoice / receipt was created for the captured charge (UI), and its id came in `Data.DocumentID`. Still open: draft documents (`authorise-only`), `SendDocumentByEmail`, and whether the default type is stable (we do not send `DocumentType`). |
| 7 | A documented DECLINE scenario in the test terminal; any API field that identifies a test organization | **Blocked:** no documented decline card/amount (support does not know one). No card number is guessed. Question to SUMIT: which card or amount declines in the test terminal? Identity is attested by documented signals only (below). |

## D. Observed in the TEST organization (lab runs of 2026-10-22)

Observations from the test organization only. **They are not statements about production defaults or about SUMIT's guarantees.** One run is one observation; the app's conservative handling (C1) is unchanged.

| # | Observation | Source | Status |
|---|---|---|---|
| D1 | `save-card` (documented test card, last four 0772): `setforcustomer` returned a customer id and a payment-method id; `getforcustomer` showed the same last four. | lab recording | observed once |
| D2 | `replace-card` (second documented card, last four 1333): the customer id stayed the same, the new card became the active one, the old card became inactive, and **the payment-method id changed**. Do not store a payment-method id as permanent. | lab recording | observed once; matches support's answer (A) |
| D3 | The FIRST `charge-saved` request was answered with HTTP 200 and `Status = BusinessError`, message "Missing organization details (Corporate Number / Phone Number)". No payment object, no payment id. So a `BusinessError` can be a configuration / validation error and not a bank decline (C1 stays: the app treats it as `rejected` and does not retry). | lab recording | observed once |
| D4 | After the organization's business number and phone were filled in (checked read-only: both returned filled, values not recorded), ONE new `charge-saved` request (VAT-included, 39 NIS, saved card ending 1333, `SendDocumentByEmail` off, no card data sent) was answered `Status = 000`, `ValidPayment = true`, `Amount = 39`, `Currency = 0`. | lab recording | observed once |
| D5 | **VAT, observed in the test organization:** with `VATIncluded = true` the final amount was 39 NIS including VAT. In the SUMIT UI the created document is a tax invoice / receipt (חשבונית מס/קבלה) number 10000: 33.05 NIS before VAT, VAT 18% = 5.95 NIS, total 39 NIS, card ending 1333 (checked by the account owner in the UI). | lab recording + SUMIT UI | observed once; **not a claim about production defaults** |
| D6 | **Currency, observed:** `Currency = 0` in the response matched the display in NIS in the UI. The meaning of the code `0` is not documented in the response itself; it is taken from this one match only. | lab recording + SUMIT UI | observed once |
| D7 | **Where the document id is:** in the CHARGE response it arrived in `Data.DocumentID` (with `Data.DocumentNumber`); `Payment.DocumentID` was `0` there. In the READ-BACK (`payments/get`) it arrived in `Payment.DocumentID`. So the app must not read the document id from `Payment.DocumentID` of the charge response. **Handled in `chargeSumitCustomer`:** a valid id is a positive integer (0, null, text = none); `Payment.DocumentID` is used when valid, otherwise `Data.DocumentID`; when BOTH are valid but different, the reply is not trusted (`invalid-response`, the internal message names the payment id for reconciliation, no document id is guessed, no retry). | lab recording | observed once; handling covered by tests |
| D8 | The read-back (`payments/get`) agreed with the charge on id, amount, currency, `Status` and `ValidPayment`. It differed in `Date` (precision only: microseconds vs seconds), in `StatusDescription` (the charge said "מאושר (קוד 000)", the read-back only " (קוד 000)" - **do not rely on the description text**) and in `DocumentID` (D7). The app classifies a read-back as `unconfirmed`, by design. | lab recording | observed once |
| D9 | The organization's business number and phone are required before SUMIT will issue the document / accept the charge (D3, D4). The read-only `orgdetails` lab step reports only filled / missing. | lab recording | observed |

Not covered by D: the document type was checked in the UI only for this one run (the API does not return it); the test-terminal mark; `VATIncluded = false`; authorise-only; a decline; the UPAY CVV exemption.

## E. The card step of the registration (an experiment): what payments.js does, observed in the test organization (2026-10-22)

Read from SUMIT's public script (https://app.sumit.co.il/scripts/payments.js, ~2.5 KB) and run in a browser against the test organization (`scripts/sumit-lab/payments-js-prototype`, documented test cards only, 8 tokenization calls). **Observations, not guarantees:** the script is SUMIT's, unversioned, and can change.

| # | Observation | Consequence in the app |
|---|---|---|
| E1 | **jQuery is required.** Without a global `jQuery` every call throws `ReferenceError: jQuery is not defined` (the script itself loads fine). | The form bundles `jquery@3.7.1` (exact version, loaded only on step 6) and sets only `window.jQuery`. |
| E2 | `OfficeGuy.Payments.CreateToken(settings)` reads the card from inputs marked `data-og="cardnumber|expirationmonth|expirationyear|cvv"` in `settings.FormSelector`, sets their `name` to "" (so a native submit never carries the card), and posts them from the browser to `https://api.sumit.co.il/creditguy/vault/tokenizesingleuse/`. | The card lives in the page's DOM for a moment (unlike PayMe's iframes). The form uses uncontrolled inputs, clears them when a token exists, and the copy no longer claims an iframe. |
| E3 | **A callback exists that the help page does not mention:** `ResponseCallback(response)` (also `Callback(token)`). A success is `{ Status: 0, Data: { SingleUseToken } }` - a 36-character uuid; an empty card number gives HTTP 200 with `{ Status: 1, UserErrorMessage }` (and the script writes that text into `ErrorsClass`). | The form calls `CreateToken` itself with `ResponseCallback` (never `BindFormSubmit`), maps a non-zero Status to its own Hebrew text and never shows SUMIT's. |
| E4 | **No double-submit protection.** Two calls in a row sent two requests and created two tokens; two `requestSubmit()` calls on a bound form did the same. | The form holds a lock before anything starts; one tokenization per click; no native submit (Enter included). |
| E5 | If a hidden `input[name=og-token]` already holds a value, `CreateToken` returns `true` and sends **nothing** (the callback is not called). In the documented `BindFormSubmit` flow without a callback, the token is placed in the form and the form is then submitted natively (the post contained only the plain fields and `og-token` - never the card). | `requestToken` empties that field before every attempt and after the answer. |
| E6 | **If the request cannot be sent (unreachable host), the callback is never called.** | `requestToken` has its own 20 s timeout and answers "no-answer"; a late answer is ignored. |
| E7 | An **expired documented test card still tokenizes** (Status 0): the token step does not validate the card. | Validation of the card happens at SUMIT only when it is saved/charged; the browser checks the shape only (the documented test cards do not all pass Luhn, so no Luhn check). |
| E8 | The registration-save lab step (real service, SUMIT Test, **fake database**): token -> `customers/create` (found by external id) -> `setforcustomer` -> `getforcustomer`; the row written to the fake database had `provider='sumit'`, `provider_token=null`, a numeric customer id, a payment-method id and the card's last four digits; **no charge request was sent**; a listed email saved the card and a stranger was refused **with `SUMIT_DRY_RUN=false`** without any request. | Observed once. The real Supabase was never touched (its client throws in the lab). |

**E9 - the real `SumitCardForm` in a browser (mocks only, no SUMIT, no Supabase)** - `scripts/sumit-lab/card-form-harness` (README there): 46 checks pass, and five of them were seen to FAIL when the guards were removed. Covered: success, a double click plus a submit (one tokenization, one save, only `registrationId` / `token` / `payer` / `consent` sent, no card data in what the action received, card wiped), a server-action error and a throw followed by a retry, payments.js refusing the card, payments.js answering twice, the timeout followed by a LATE valid answer and a retry, the form removed before payments.js answers (the late answer starts nothing), the form removed during the save (no completion), browser-side validation, and jQuery loading from the bundle. `next build` succeeds; jQuery is a separate lazy chunk (~87 KB) referenced only by the two chunks that contain the form.

**E10 - the real form with the REAL payments.js against the test organization, server action mocked (2026-10-22):** 11 checks pass. A double click plus a submit sent exactly ONE tokenization request (`api.sumit.co.il`, HTTP 200); the token reached the mocked action exactly once, uuid-shaped, and it was the same token as in SUMIT's answer (compared by SHA-256 - the token itself was never printed or stored); the action received only `registrationId`, `token`, `payer`, `consent` and no card data; the card inputs and the hidden `og-token` were empty afterwards; the page talked only to the local server, `app.sumit.co.il` and `api.sumit.co.il`, and to no other SUMIT endpoint (no customer, no saved card, no charge). A first attempt in this mode used the harness's shortened 300 ms timeout and so hit the form's timeout before SUMIT answered: the late real answer started no save (observed, not planned); it cost one extra tokenization call (two in total for this task). Observed in the same run: the real script's answer takes longer than 300 ms, so the 20 s timeout is not excessive.

**E11 - coming back to step 6:** `SumitCardStep` asks the server (read only: `getSumitCardSavedStatusAction`, which returns only saved / not-saved / error) before it shows the form. If the card is already saved it says so and offers "continue" - the form is not shown and nothing is saved automatically; if the check fails (an error answer or a failed call) the owner gets a message and "try again" and NO form - the form appears only on an explicit not-saved answer, so a card that may already be saved is never asked for twice. Covered by the unit tests and by the mock browser scenarios (a normal save, and a save that finished on the server after the page was left).

Not tested: the form inside the real wizard with a real signed-in owner (it writes a real registration to the live database), the real payments.js inside the real form, an ID-number (citizenid) requirement under UPAY in production, behaviour when SUMIT's script host is blocked, and what a re-used one-time token does. Known edge: if the form is removed while the save is already running, the card IS saved on the server but no completion / navigation happens in the browser.

## E. Registration card-save check in Preview (2026-10-22) - PASSED

A test registration was completed in the Preview deployment against the SUMIT TEST organization with the documented test card ending 0772. Verified read-only (database + `getforcustomer`), twice: right after the save and again after revisiting the completion page.

| Check | Result |
|---|---|
| Registration | `pending`, `trial_status = not-started`; not approved |
| Card rows | exactly ONE `billing_payment_methods` row for the registration (and one SUMIT row in the whole table): `provider = sumit`, `provider_token` null, SUMIT customer id, SUMIT payment-method id, card mask ending 0772 - nothing else |
| Events | exactly one `payment_method_added` (`business_events_log`; metadata keys: `stage`, `provider`); no `billing_events` |
| Subscription / transactions | none |
| SUMIT Test | the customer has one ACTIVE card ending 0772, the same payment-method id as the row, and the method's customer id equals the row's customer id |
| Revisit of the completion page (after a refresh) | shows "הכרטיס נשמר" with no form; afterwards the row, its payment-method id, the event count and the SUMIT card were unchanged - no second save |

Scope and limits: one test registration, TEST organization, the documented test card only; nothing was charged. It shows the save path works end to end; it does not show anything about approval, subscriptions, charging or production. The link "this SUMIT customer belongs to this registration" rests on the stored customer id (the API does not return our `ExternalIdentifier` on this read).

## F. Stage 2B-1: admin approval starts a TRIAL for a saved SUMIT card (code + tests; the approval CLICK itself is not yet verified end to end - see G)

- `decideApprovalPath` has a new path `activate-sumit-trial` (card provider = `sumit`), independent of PayMe's state. `activateSumitTrialOnApproval` (`src/repositories/sumit-trial-activation.ts`) writes a LOCAL subscription row (`payment_provider = sumit`, `provider_subscription_id = NULL`, `status = trialing`) and approves + publishes the business. It imports no payment provider and makes no network call.
- Trial policy is the existing one, unchanged: the length comes from the offer stored on the business (`launch_standard` = 30 days, `pilot_2026` = 90), counted from the approval, snapshotted on the row. `next_billing_at` = the end of the trial (a PLANNED date; nothing reads it to charge).
- Idempotent: `UNIQUE(business_registration_id)` makes a concurrent second approval lose (`already-exists`, touches nothing); a later approval finds the business no longer pending. The approve step is guarded by `status = pending`; if it fails the subscription row we wrote is removed.
- Cannot enter automatic billing: nothing charges; a SUMIT row has no `provider_subscription_id`, so the existing hourly job `expire_due_trials` ends the trial at `trial_ends_at` with no grace window (no charge). The owner page shows no billing date for it, and the admin revenue table shows "—" for a SUMIT row's next-billing date.
- Admin sees SUMIT card info from provider + mask only (last four digits), with the approval dialog and the card section saying: no charge, trial days from the offer, billing not connected.
- Rejection (an approved business has its own "הסתרת העסק" section with one reject button): rejecting a business ends its UNBILLED SUMIT trial locally first (`cancelSumitTrialForRejection`: `canceled`, no provider call, no charge; re-runnable; a SUMIT subscription that is not an unbilled trial refuses the rejection for manual handling; a failure after the trial ended is reported as an error, never success). Details and the cleanup variant: `docs/sumit-test-business-hide-and-cleanup.md`.
- Known gaps (not part of this stage): the card stays at SUMIT after a rejection (removed by hand / an approved lab step); the card-less trial path for real owners; the first charge, cron, retries, grace and revenue recognition (Stage 2C+).

## G. Rejection test in Preview (2026-10-25) - PASSED; what it did and did NOT prove

One SUMIT test business, Preview deployment `780a2d2`, read-only verification of the database, the public site and the SUMIT card afterwards.

**Exercised through the real UI / real code path (Preview):**
- the admin page of an approved business: SUMIT card text (last four, "no charge"), the trial-status line derived from the SUMIT subscription, the separate "הסתרת העסק" section with the reject dialog (delete button stays apart);
- the reject action: `cancelSumitTrialForRejection` ran BEFORE the status change - the subscription became `canceled` (`canceled_at` set, `next_billing_at` cleared, still no provider id, no payment fields), exactly one `subscription_canceled` event (`provider: sumit`, `charged: false`), one `business-rejected` audit entry (`sumitTrialCanceled: true`), the business `rejected`, the notification resolved;
- no `billing_transactions`, no `billing_events`; the saved card row untouched (same provider, same last four, `updated_at` unchanged, no token); the business is not public (profile page "not found", the old slug redirects to the same "not found", absent from the list and from the sitemap).

**NOT exercised through the UI - created by a manual, one-time step:** the SUMIT trial subscription of that business was NOT created by the new approval path. The live site (still on the older code, which cannot see a SUMIT card) approved the business through the status-only path, so the subscription row and `active_plan_id = plus` were written by a guarded one-time SQL block (single transaction, row locked, all safety conditions checked, trial from `reviewed_at` for 30 days, event marked `repairedAfterLegacyApproval`). That block mirrors `activateSumitTrialOnApproval` by hand; it is not evidence that the function works against the real database.

**Therefore still unverified end to end:** the admin's APPROVAL click on a pending business with a saved SUMIT card (`activateSumitTrialOnApproval` against the real database: trial row, `active_plan_id`, approve + publish in one flow, the event, the audit entry), a second click / two simultaneous clicks, and the failure paths. These are covered only by unit tests with an in-memory database. Also untested: Premium, a yearly track, the Pilot offer (90 days) and the owner's own pages. Nothing in G involves a charge, a SUMIT call or billing automation.

## How the organization is attested (without printing secrets)

1. In SUMIT, switch to the TEST business (the business selector in the sidebar; "בדיקות" is added to its name, shown in red). Open https://app.sumit.co.il/developers/keys/ **while in that business** and copy the CompanyID and the keys into `.env.local` yourself. Nothing is pasted in chat.
2. Set `SUMIT_TEST_COMPANY_ID` to that CompanyID and `SUMIT_COMPANY_ID` to the same value, `SUMIT_ENVIRONMENT=test`, `PAYMENTS_PROVIDER=sumit`. The app's configuration guard refuses anything else (a different CompanyID, an unset environment, production without the unlock).
3. `npm run sumit:lab` (no approval needed) runs `preflight` OFFLINE (names of missing/invalid variables only, no network) and then `identity`, a READ-ONLY step: it reads only the organization's NAME and quotas, and passes only if the documented marker "בדיקות" is in the name. It prints PASS/FAIL, never the name's content or any key.
4. Only after PASS do we approve data-changing steps, one by one, by name (`SUMIT_LAB_APPROVED=save-card,...`).

## Test plan (local lab: `scripts/sumit-lab`, README there)

| Lab step | Plan item | What it does |
|---|---|---|
| `save-card` | 1 | tokenizes a DOCUMENTED test card (support's recommended second card), creates/finds the lab customer, `setforcustomer`, `getforcustomer`; checks the returned ids and the last four digits |
| `null-token` | 1 | `setforcustomer` with a null token: records SUMIT's answer |
| `replace-card` | 2 | saves a second documented card; the new card must become the active one; also reads the inactive list |
| `charge-saved` | 3 | VAT-included 39 NIS test charge of the SAVED card (no card data), then `get` + `list`; amount, currency, VAT and document are compared with the SUMIT UI |
| `charge-vat-false` | 3 | VATIncluded=false: what amount does SUMIT charge? (the app must answer `unconfirmed`) |
| `authorise-only` | 4 | AuthoriseOnly charge, then `get` and `list`; field-level diff against the captured payment |
| `no-method` | 5 (documented scenario) | charge a customer with no saved card (a documented misuse, not a bank decline) |
| `decline` | 5 | BLOCKED - no documented decline scenario; nothing is guessed |
| (mock tests) | 6 | `no-retry.test.ts`: timeout, network failure, 5xx, TechnicalError, BusinessError, unreadable / inconsistent / not-valid payments - exactly ONE charge request in every case, no timer, no retry |

Budget: the test organization has about 100 operations and 400 API calls per month; the lab stops at 30 calls per run (`SUMIT_LAB_MAX_CALLS`, at most 100).

## Verified from the official OpenAPI and articles

| Topic | What the docs say |
|---|---|
| `setforcustomer` | Request: `Credentials`, `Customer` required; `PaymentMethod`, `SingleUseToken` optional. Response: `Data.CustomerID`, `Data.PaymentMethod` (its `ID` may be null). |
| `charge` | Request: `Credentials`, `Customer`, `Items` required; `PaymentMethod` "Leave this empty to use the customer payment method, or when using the SingleUseToken" - this describes `charge` and says nothing about `setforcustomer`. Response: `Data.Payment` (`ID`, `ValidPayment`, `Status`, `StatusDescription`, `Amount`, `DocumentID` ...) and the document fields. |
| Envelope | `Status`: `Success (0)`, `BusinessError (1)`, `TechnicalError (2)`; `TechnicalErrorDetails`: "let us know if you received this". |
| Amounts | `UnitPrice` required (decimal), `Quantity` defaults to 1, `Total` optional, `Currency` empty = company default, `VATIncluded` defaults to false. |
| Authorise only / documents | `AuthoriseOnly`: "processed, or only validated ... documents will be issued as Draft"; valid payments issue documents by default; `PreventDocumentCreation`, `DraftDocument`, `DocumentType`, `SendDocumentByEmail` exist. |
| Test organization | Own organization and test terminal, same API address with its own CompanyID and keys (no separate host is documented); no UPAY, no 3DS; fictitious business number 999999998 on documents; "בדיקות" in the name; about 100 operations and 400 API calls a month; test cards in article 5832877. |
| payments.js | Token in the hidden field `og-token` (or a callback); needs jQuery; any flow that enters a card number on our page carries our own security obligations. |

## Remaining questions for SUMIT (the ones that cannot be tested)

1. איזה כרטיס בדיקה או סכום גורם לדחייה במסוף הבדיקות? (לא מתועד, ולכן לא ננחש מספרי כרטיס.)
2. האם יש שדה ב-API שמזהה ארגון בדיקות? (כרגע מסתמכים על הסימון המתועד "בדיקות" בשם העסק ועל התאמת ה-CompanyID.)
3. פטור CVV של UPAY בחיוב כרטיס שמור עם `payments/charge`: האם הוא חל בהגדרות ברירת המחדל, ומה משנים `PreventStandingOrder` ו-`MerchantNumber`? (לא ניתן לבדיקה בארגון בדיקות, אין בו UPAY.)

## What still blocks Stage 2B

- The card step (E) is an experiment limited to SUMIT_TEST_EMAILS on the test organization. Opening it wider, the admin's view of a SUMIT card, and what the approval does with it are NOT done: today an approval of such a registration only approves the business (no subscription, no trial).

- More lab evidence for C1, C2, C4 and the open parts of C3 / C6 (one run is not proof), before any revenue recognition or grace logic. Still approval-gated lab steps: `charge-vat-false`, `authorise-only`, `no-method`, `null-token`.
- C5 (UPAY CVV exemption) before production.
- The product decisions: whether 39 / 49 NIS include VAT (the test organization showed 39 incl. VAT when `VATIncluded = true` is sent - a product decision is still needed for what we promise customers), and the document type.
- Not storing a payment-method id as permanent (D2). (The document id of a charge is now read from `Data.DocumentID` too - D7 - and nothing consumes it yet: `PaymentResult` carries no document id.)

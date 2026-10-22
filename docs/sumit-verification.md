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
| D7 | **Where the document id is:** in the CHARGE response it arrived in `Data.DocumentID` (with `Data.DocumentNumber`); `Payment.DocumentID` was `0` there. In the READ-BACK (`payments/get`) it arrived in `Payment.DocumentID`. So the app must not read the document id from `Payment.DocumentID` of the charge response. | lab recording | observed once |
| D8 | The read-back (`payments/get`) agreed with the charge on id, amount, currency, `Status` and `ValidPayment`. It differed in `Date` (precision only: microseconds vs seconds), in `StatusDescription` (the charge said "מאושר (קוד 000)", the read-back only " (קוד 000)" - **do not rely on the description text**) and in `DocumentID` (D7). The app classifies a read-back as `unconfirmed`, by design. | lab recording | observed once |
| D9 | The organization's business number and phone are required before SUMIT will issue the document / accept the charge (D3, D4). The read-only `orgdetails` lab step reports only filled / missing. | lab recording | observed |

Not covered by D: the document type was checked in the UI only for this one run (the API does not return it); the test-terminal mark; `VATIncluded = false`; authorise-only; a decline; the UPAY CVV exemption.

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

- More lab evidence for C1, C2, C4 and the open parts of C3 / C6 (one run is not proof), before any revenue recognition or grace logic. Still approval-gated lab steps: `charge-vat-false`, `authorise-only`, `no-method`, `null-token`.
- C5 (UPAY CVV exemption) before production.
- The product decisions: whether 39 / 49 NIS include VAT (the test organization showed 39 incl. VAT when `VATIncluded = true` is sent - a product decision is still needed for what we promise customers), and the document type.
- Reading the document id from `Data.DocumentID` of the charge response (D7), and not storing a payment-method id as permanent (D2).

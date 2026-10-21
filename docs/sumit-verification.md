# SUMIT - what is verified, what is blocked, and what to ask SUMIT support

Rule used here: only what SUMIT's OWN documentation says is "verified". Anything else is **blocked for verification** and the code
must not rely on it. Sources: the official OpenAPI (`https://api.sumit.co.il/swagger/v1/swagger.json`, vendored as property names in
`src/lib/sumit/__fixtures__/sumit-api-contract.json`), https://app.sumit.co.il/developers/api/, and the help-center articles
[5893615 payments.js](https://help.sumit.co.il/he/articles/5893615), [5840939 testing](https://help.sumit.co.il/he/articles/5840939),
[15291230 test configuration](https://help.sumit.co.il/he/articles/15291230), [5832877 test cards](https://help.sumit.co.il/he/articles/5832877),
[5833033 charging with the API](https://help.sumit.co.il/he/articles/5833033), [5792403 saved cards](https://help.sumit.co.il/he/articles/5792403).

The contract fixture checks FIELD NAMES only. It does not prove any business behaviour.

## Verified (official)

| Topic | What the docs say |
|---|---|
| `setforcustomer` request | `Credentials` and `Customer` required; `PaymentMethod` and `SingleUseToken` optional. `SingleUseToken` = "for all payment details (CardNumber, Expiration, CVV, CitizenID). Used primarily by the Payments JavaScript API"; the operation's note: "To generate a SingleUseToken use payments.js". |
| `setforcustomer` response | `Data.CustomerID` and `Data.PaymentMethod` (the schema's `PaymentMethod.ID` is nullable). |
| `charge` request | `Credentials`, `Customer`, `Items` required. `PaymentMethod`: "Leave this empty to use the customer payment method, or when using the SingleUseToken". Official article: a customer whose card is saved needs only the customer id and the billing details. **This describes `charge`; it says nothing about how `setforcustomer` treats a token or an existing method.** |
| `charge` response | `Data.Payment` (`ID`, `CustomerID`, `Date`, `ValidPayment`, `Status`, `StatusDescription`, `Amount`, `Currency`, `PaymentMethod`, `AuthNumber`, `DocumentID` ...), plus `Data.DocumentID`, `DocumentNumber`, `CustomerID`, `DocumentDownloadURL`. |
| Envelope | `Status` is `Success (0)`, `BusinessError (1)` or `TechnicalError (2)`; `UserErrorMessage` is "in a user readable format"; `TechnicalErrorDetails` is "Technical error details, let us know if you received this". |
| Amounts (as documented) | `ChargeItem.UnitPrice`: "Single unit price in payment currency - Required field"; `Quantity` defaults to 1; `Total` optional; `Currency` empty = company default. `VATIncluded`: "Defaults to false". `VATRate`: empty = company default. The official example uses `UnitPrice: 50, Quantity: 2` (decimal numbers). |
| Authorise only | `AuthoriseOnly`: "processed, or only validated ... could be used for testing the Charge action easily ... documents will be issued as Draft". `AuthorizeAmount`, `AutoCapture` (J4 / J5) exist. |
| Documents | "All valid payments issue documents" by default (final or draft per `DraftDocument` / the application setting); `PreventDocumentCreation`; `DocumentType` empty = default; `SendDocumentByEmail`. The article: "once a charge is made we issue a document automatically". |
| Test organization | A separate "test configuration" organization with its own test terminal; reached with its own CompanyID and keys (no separate API host or parameter is documented). No UPAY connection and no 3DS there; documents carry the fictitious business number 999999998; about 100 operations and 400 API calls per month. Test cards: article 5832877 (the two "fictitious" cards only pass validity checks). |
| payments.js | Returns the token in the hidden field `og-token` (or via `Callback` / `ResponseCallback`); it needs jQuery. The official API article says that any flow in which a card number is entered on your page requires you to check your security obligations with the relevant parties, including the clearing companies. |

## Blocked for verification (not documented - do not rely on it)

1. **What exactly does `BusinessError` mean on `payments/charge`?** Not defined. The code therefore never treats it as a certain refusal: it throws `rejected` (outcome unproven).
2. **Does `ValidPayment: false` guarantee that nothing was captured?** Not defined (only "Indicates if the payment is valid"). The code therefore does NOT return a failure for it: the result is `unconfirmed` (reason `reported-not-valid`, `requiresReconciliation: true`). There is no `failed` outcome at all; no automatic retry, no dunning from it, no revenue.
3. **How to tell an authorise-only payment from a captured one on `payments/get` / `list`.** No field is documented. The code never lets a read-back become "succeeded" (`unconfirmed`, mode `unknown`).
4. **Amount unit and VAT.** Whether `Payment.Amount` is in shekels (decimal) and is the total including VAT; with `VATIncluded=false` whether it is price + VAT. The code requires an exact match only for a VAT-included price (that match is the only thing that can make a captured payment `succeeded`). With `VATIncluded=false` a captured, valid payment is ALWAYS `unconfirmed` (reason `amount-rules-unverified`), whatever the amount - a higher amount is plausible, not proven; a lower one throws.
5. **`setforcustomer` behaviour:** does it validate the card or only store it; is the `SingleUseToken` consumed / how long is it valid; does it replace or add to an existing method; what does an invalid or used token return; is a null `PaymentMethod.ID` normal.
6. **UPAY / CVV exemption** on a saved-card `charge`, and what `PreventStandingOrder` ("defaults to false") and `MerchantNumber` change. The test organization has no UPAY, so this cannot be tested there.
7. **Idempotency:** `billing/payments/charge` has no request identifier in the schema (only `creditguy/gateway/transaction` has `UniqueIdentifier`).
8. **The default `DocumentType`** for our organization, and whether `DocumentID` is populated for draft (authorise-only) documents.
9. **How to produce a decline in the test terminal**, and whether any API field identifies an organization as a test organization.
10. **Written approval to use payments.js** (card fields in our page) under the UPAY / clearing arrangement.

## Questions for SUMIT support (ready to send)

1. ב-`/billing/payments/charge/`: אילו מצבים מחזירים `Status: BusinessError` ואילו מחזירים `Status: Success` עם `ValidPayment: false` (כרטיס נדחה, כרטיס פג תוקף, אין אמצעי תשלום שמור, לקוח לא קיים, הרשאות שגויות, נדרש CVV)? האם `BusinessError` מבטיח שלא בוצע חיוב? האם `ValidPayment: false` מבטיח שלא נתפס סכום? מהם הערכים האפשריים של `Payment.Status`?
2. ב-`/billing/payments/get/` וב-`/billing/payments/list/`: איזה שדה מבדיל בין חיוב שבוצע בפועל לבין `AuthoriseOnly`? האם `AuthoriseOnly` משאיר חסימה על הכרטיס, והאם הוא מופיע ברשימה?
3. האם `Payment.Amount` הוא בשקלים (מספר עשרוני) וכולל מע"מ? כש-`VATIncluded=false`, האם הסכום שנגבה הוא `UnitPrice × Quantity` ועוד מע"מ? מהו פורמט `Payment.Currency` בתשובה?
4. ב-`/billing/paymentmethods/setforcustomer/` עם `SingleUseToken`: האם הכרטיס מאומת מול שב"א או רק נשמר? האם הטוקן חד-פעמי ומה תוקפו? האם הכרטיס מחליף אמצעי תשלום קיים או מתווסף? מה מוחזר בטוקן לא תקין או משומש? האם `PaymentMethod.ID` יכול להיות null בהצלחה?
5. בחיוב כרטיס שמור בלי CVV (פטור CVV של UPAY): האם `payments/charge` עם לקוח בלבד עובר דרך מוסד/מסוף שפטור מ-CVV בהגדרות ברירת המחדל? מה משנים `PreventStandingOrder` (ברירת מחדל false) ו-`MerchantNumber`? נבקש אישור בכתב.
6. האם יש שדה בקריאת `payments/charge` שמונע חיוב כפול (מזהה בקשה ייחודי)? האם `Payment.ExternalIdentifier` ניתן להגדרה בחיוב?
7. מהו `DocumentType` ברירת המחדל בארגון שלנו ואיפה הוא מוגדר? האם `DocumentID` מוחזר גם למסמך טיוטה? האם `SendDocumentByEmail` דורש כתובת מייל בכרטיס הלקוח?
8. במסוף הבדיקות: איזה כרטיס או סכום מחזיר דחייה? האם יש שדה ב-API (למשל בפרטי החברה) שמזהה ארגון בדיקות?
9. האם מותר להשתמש ב-`payments.js` (שדות הכרטיס בעמוד שלנו) במסגרת הסדר UPAY/הסליקה שלנו, או שמומלץ עמוד סליקה מתארח?

## What still blocks Stage 2B

- Answers 1-3 (decline vs error semantics, authorise vs capture, amount/VAT) - before any revenue recognition or grace logic.
- Answer 4 (what `setforcustomer` does with the token) - before the card step is built.
- Answers 5 and 9 (UPAY CVV exemption, payments.js approval) - before production; they cannot be tested in the test organization.
- The product decisions: whether 39 / 49 NIS include VAT, and the document type.

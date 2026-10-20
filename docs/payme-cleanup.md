# PayMe cleanup (TODO - only AFTER SUMIT passes end to end)

**Decision (2026-10-20):** PayMe did not work for this project. SUMIT (+ its UPAY terminal) is the only payment provider.
`PAYMENTS_PROVIDER=sumit` is the only accepted value; unset, `payme` or anything else is a `PaymentsConfigurationError`
(`src/lib/payments/get-payment-provider.ts`). There is never an automatic fallback to PayMe.

PayMe is **legacy / dormant**: kept in the code until SUMIT is proven end to end, not connected to any new flow, not a fallback.
Do not build anything new on `src/lib/payme/*`.

## Status of the legacy code today

The existing registration / approval screens still read the PayMe configuration (PAYME_* variables) directly, not
`PAYMENTS_PROVIDER`. Until Stage 2B rewires them, PayMe's flow is the one those screens use when PAYME_* is set (see the audit
in the Stage 2 notes). Making that flow dormant is part of Stage 2B, not of the selector.

## Gate: do NOT start the cleanup until ALL of these are true

- [ ] SUMIT E2E on production data path: registration step 6 saves a card -> admin approval -> trial -> first charge at trial end -> invoice/receipt issued
- [ ] failed payment -> grace period -> recovery, and cancellation, verified with SUMIT
- [ ] the open SUMIT questions are answered (setforcustomer validation, UPAY terminal without CVV/ID, BusinessError semantics, AuthoriseOnly, VAT)
- [ ] no registration still depends on a PayMe row or subscription (`billing_payment_methods.provider = 'payme'`, `business_subscriptions.payment_provider = 'payme'`)

## Delete after the gate (code)

- `src/lib/payme/**` (client, config, flow-access, build-subscription-plan [move the plan builder out first - SUMIT reuses it], payme-helpers, process-callback, decide-subscription-transition, verify-callback, payment-resume, live-readiness)
- `src/app/api/webhooks/payme/[secret]/route.ts` (+ test) and the `/api/webhooks/` exception in `src/lib/seo/legacy-host-redirect.ts` if nothing else uses it
- `src/components/business-dashboard/PaymentMethodTrialForm/**` (Hosted Fields form, `cdn.payme.io` script, PayMe copy) - replaced by the payments.js form
- `src/components/business-dashboard/CancelPayMeSubscriptionButton/**`
- PayMe branches in: `supabase-subscription-service.ts` (generate/cancel subscription, buyer key), `payment-actions.ts`, `subscription-actions.ts`, admin `businesses/[id]` (`actions.ts`, `ApproveRejectPanel.tsx`, `BusinessBillingTestControl.tsx`, `change-billing-test-schema.ts`, `page.tsx`), admin `revenue` (`page.tsx` copy, readiness notice, "PayMe" column), `decide-registration-approval.ts` (`paymeEnv`), `get-subscription-access.ts` / `get-subscription-summary.ts` (`paymentProvider === "payme"`)
- `src/lib/security-headers.ts` comment that mentions PayMe hosted fields
- the `buyer-key-exposure` guard test pieces that exist only for PayMe's token
- the `"payme"` member of `BillingProvider`, `PaymentProviderId` and the `payment_provider` unions (after the DB rows are gone)

## Remove after the gate (configuration)

- Vercel (Production): `PAYME_ENV`, `PAYME_SELLER_ID`, `PAYME_HOSTED_FIELDS_KEY`, `PAYME_WEBHOOK_SECRET`, `PAYME_SANDBOX_TEST_EMAILS`
- `.env.example`: the PAYME_* block
- the callback URL registered anywhere at PayMe (nothing to do on our side once the account is closed)

## Database (only with explicit approval, each as its own reviewed migration)

- **Never** edit or delete migration history (`supabase_migrations.schema_migrations`, the `payme_billing_foundation` migration).
- Keep `'payme'` as an allowed provider value as long as any historical row has it (billing_events / billing_transactions are the audit trail).
- `billing_payment_methods.provider` still has `DEFAULT 'payme'`: change the default (or drop it) in a migration once nothing writes PayMe rows, so a write that omits `provider` can never become a PayMe row by accident.
- Optional, later: remove the PayMe-only branch of `billing_payment_methods_provider_shape_check` if no PayMe row remains.

## Delete NOTHING from this list before the gate is green.

# One full registration test: SUMIT card step against the LIVE Supabase, local site, SUMIT Test only

Scope (approved by the owner): ONE registration made with a DEDICATED test account, through the local site (`npm run dev`) and the SUMIT **test** organization. Nothing else: no approval, no publishing, no subscription, no charge, no `AuthoriseOnly`, no push, no deploy. If any result is not as expected, STOP and report BEFORE any cleanup.

The local site uses the LIVE Supabase project (`.env.local`), so only the steps below are done on it.

## Baseline (read-only, taken before the test)

| What | Count |
|---|---|
| `business_registrations` | 5 |
| `admin_notifications` | 20 |
| `billing_payment_methods` | 0 |
| `business_subscriptions` | 1 |
| `billing_transactions` | 0 |
| `profiles` | 0 |
| `auth.users` | 4 |
| `rate_limit_hits` | 36 |
| `storage.objects` under `business-media/registrations/` | 21 |

## What the test writes (and nothing else)

1. `auth.users` (1) and `profiles` (1) - the test account, created by the owner through `/business/owner/signup` (the sign-up also adds an IP-keyed `rate_limit_hits` row `owner-signup:<ip>`, which expires by itself and is NOT deleted by the cleanup).
2. `business-media` storage: the images uploaded in the wizard, under `registrations/<registration id>/`.
3. `business_registrations` (1): `pending`, Plus, `owner_id` = the test account.
4. `admin_notifications` (1): "עסק חדש ממתין לאישור" (DB trigger; **no email** is sent for Plus/Premium).
5. `rate_limit_hits`: one `payment-method:<owner id>` row per save attempt.
6. `billing_payment_methods` (1): `provider='sumit'`, `provider_token=null`, numeric customer id, payment-method id, card mask.
7. `business_events_log` (1): `payment_method_added`.

In SUMIT Test: one customer (external id = the registration id) and one saved card, ~3-4 API calls. NOT written: `business_subscriptions`, `billing_transactions`, `billing_events`, an `approved` status, any public page.

## Test account and `SUMIT_TEST_EMAILS`

Create the account yourself (accounts are never created by the assistant):

1. Pick a dedicated address that reaches your own inbox, e.g. a Gmail plus-alias of your address (`name+sumit-test@gmail.com`). Do NOT use the address of your real owner account: that account already owns an approved business, and the owner area picks `ownedBusinessIds[0]` without an order.
2. Open `http://localhost:3000/business/owner/signup` (start `npm run dev` first), fill full name, a username (lowercase letters, digits, hyphens), the alias address, a password you do not share, tick the privacy consent.
3. If "Confirm email" is on, open the email and click the link. If the link opens the production domain and says "invalid link", ignore it: the address is confirmed anyway; go back to `http://localhost:3000/business/owner/login` and sign in with the password.
4. In `.env.local` set `SUMIT_TEST_EMAILS=<the alias>` (replace the current value, so only the test account can see the card step). Stop and restart `npm run dev`. Never paste the value, a password or a key in chat.

## The registration

Business name EXACTLY: `בדיקת SUMIT - למחיקה` (the cleanup matches it). Fill the wizard with minimal data and **one small image** (cover image is mandatory; no gallery). Step 5: submit. Step 6: the SUMIT card form with a documented test card (SUMIT's article 5832877). Do NOT approve, publish or open the approval buttons of this registration in the admin area (the admin bell will show the notification; leave it).

## Checks after the card was saved (read-only)

Registration `pending`, plan `plus`; one `billing_payment_methods` row with `provider='sumit'`, `provider_token is null`, numeric `provider_customer_id`; one `business_events_log` row; no subscription / transaction / billing event; one `admin_notifications` row; no email recorded; storage objects only under the registration's folder; in the SUMIT Test UI the customer shows an active card ending with the card's last four digits. After a reload of step 6 (or `/business/payment-method`) the app says the card is already saved and shows no form.

## Cleanup (only after the checks passed, or on the owner's instruction)

### 1. Database: ONE atomic block - verify and lock first, delete only inside the proof

The block locks the registration row and verifies the exact id, owner, name, `pending`, plan, creation time, that the owner has no other registration, and that nothing beyond the expected rows exists. **If any condition fails it raises an exception before any delete** (the whole block is rolled back). Replace the four values at the top; `v_since` is the time the test started (UTC).

```sql
do $$
declare
  v_id    uuid        := '<REGISTRATION ID>';
  v_owner uuid        := '<TEST OWNER ID>';
  v_name  text        := 'בדיקת SUMIT - למחיקה';
  v_since timestamptz := '<TEST START, e.g. 2026-10-22T18:00:00Z>';
  r record;
  n int;
begin
  -- 1) lock the registration and prove it is THE test registration
  select * into r from public.business_registrations where id = v_id for update;
  if not found then raise exception 'ABORT: registration % not found', v_id; end if;
  if r.owner_id is distinct from v_owner then raise exception 'ABORT: owner mismatch'; end if;
  if r.business_name is distinct from v_name then raise exception 'ABORT: name mismatch'; end if;
  if r.status <> 'pending' then raise exception 'ABORT: status is %, not pending', r.status; end if;
  if r.plan_tier <> 'plus' then raise exception 'ABORT: plan is %, not plus', r.plan_tier; end if;
  if r.created_at < v_since then raise exception 'ABORT: the registration predates the test'; end if;

  -- 2) the owner is the dedicated test account: it owns exactly this registration
  select count(*) into n from public.business_registrations where owner_id = v_owner;
  if n <> 1 then raise exception 'ABORT: the owner has % registrations, expected 1', n; end if;

  -- 3) nothing that the test must not have created
  select count(*) into n from public.business_subscriptions where business_registration_id = v_id;
  if n <> 0 then raise exception 'ABORT: % subscription(s) exist', n; end if;
  select count(*) into n from public.billing_transactions where business_registration_id = v_id;
  if n <> 0 then raise exception 'ABORT: % billing transaction(s) exist', n; end if;
  select count(*) into n from public.billing_events where business_registration_id = v_id;
  if n <> 0 then raise exception 'ABORT: % billing event(s) exist', n; end if;
  select count(*) into n from public.business_analytics_events where business_id = v_id;
  if n <> 0 then raise exception 'ABORT: % analytics event(s) exist', n; end if;
  select count(*) into n from public.business_reviews where business_id = v_id;
  if n <> 0 then raise exception 'ABORT: % review(s) exist', n; end if;
  select count(*) into n from public.business_slug_redirects where business_id = v_id;
  if n <> 0 then raise exception 'ABORT: % slug redirect(s) exist', n; end if;
  select count(*) into n from public.business_notifications where business_registration_id = v_id;
  if n <> 0 then raise exception 'ABORT: % business notification(s) exist', n; end if;

  -- 4) the rows the test is EXPECTED to have are exactly what it created
  select count(*) into n from public.billing_payment_methods
    where business_registration_id = v_id and provider = 'sumit' and provider_token is null and created_at >= v_since;
  if n > 1 then raise exception 'ABORT: % card rows, expected at most 1', n; end if;
  select count(*) into n from public.billing_payment_methods where business_registration_id = v_id;
  if n > 1 then raise exception 'ABORT: unexpected card rows'; end if;
  select count(*) into n from public.business_events_log
    where business_registration_id = v_id and (event_type <> 'payment_method_added' or created_at < v_since);
  if n <> 0 then raise exception 'ABORT: % unexpected event(s) in the log', n; end if;
  select count(*) into n from public.admin_notifications
    where entity_id = v_id and (type <> 'business-registration' or entity_type <> 'business-registration' or created_at < v_since);
  if n <> 0 then raise exception 'ABORT: % unexpected notification(s)', n; end if;

  -- 5) delete ONLY what this test created, in this order
  delete from public.admin_notifications where entity_id = v_id and entity_type = 'business-registration';
  delete from public.rate_limit_hits where rate_key = 'payment-method:' || v_owner::text and created_at >= v_since;
  delete from public.business_registrations where id = v_id and owner_id = v_owner and status = 'pending' and business_name = v_name;
  -- cascades: billing_payment_methods, business_events_log (and the empty business_* tables checked above)

  raise notice 'cleanup done for %', v_id;
end $$;
```

After it: re-run the baseline counts; they must be back to the baseline above (`auth.users` and `profiles` +1 until step 3 below).

### 2. Storage: only the registration's own files, only after the database cleanup

```bash
node scripts/sumit-lab/e2e-registration/storage-cleanup.mjs --id <REGISTRATION ID> --since <TEST START ISO> --expect <number of uploaded images>          # list only
node scripts/sumit-lab/e2e-registration/storage-cleanup.mjs --id <REGISTRATION ID> --since <TEST START ISO> --expect <number> --delete  # delete
```

The script refuses unless: the registration row no longer exists, every object under `registrations/<id>/` was created at or after `--since`, and their number equals `--expect`. It reads the service key from `.env.local` and prints no secret.

### 3. The test account (the owner's decision)

Delete the user in the Supabase dashboard (Authentication -> Users). Its `profiles` row goes with it (`ON DELETE CASCADE`); the registration is already gone, so the `NO ACTION` foreign key does not block it. Then restore `SUMIT_TEST_EMAILS` as wanted.

### 4. SUMIT Test

The customer and the saved card stay in the test organization (it is the test organization); remove them in the SUMIT UI if you want. No automatic deletion.

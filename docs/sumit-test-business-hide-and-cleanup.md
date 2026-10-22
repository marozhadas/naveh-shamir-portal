# Hiding and cleaning up a PUBLIC test business (approved + card-less trial) - PROPOSAL, nothing here is executed

Situation this proposal is for: a test registration that the owner approved and for which a card-less trial was started. It is therefore (1) public - a profile page under its slug and a place in the lists - and (2) holds a subscription row. The first cleanup procedure (`docs/sumit-e2e-registration-test.md`) deliberately aborts for it (it requires `pending` and no subscription). Identifiers are placeholders on purpose: this repository is public.

## What exists for such a business (read-only facts)

| Where | What |
|---|---|
| `business_registrations` | 1 row: `approved`, Plus, `active_plan_id = plus`, a slug the admin chose |
| `business_subscriptions` | 1 row: `trialing`, `payment_provider` NULL (a card-less trial), 30 trial days |
| `business_events_log` | `trial_started` |
| `admin_notifications` | 1 row, already `resolved` |
| `business_slug_redirects` | 1 row (old slug -> the admin's slug) |
| `admin_audit_log` | slug change and approval entries (an audit trail - NOT deleted) |
| storage `business-media` | the images of the registration |

Two independent gates make a business public (`resolve-business-view.ts`): its status must be `approved`, AND its subscription must give listing access (`canOpenProfile`). Ending only the trial would leave a basic card in the lists, so hiding is done through the status.

## Step 1 - HIDE (reversible, nothing deleted)

Recommended: use the admin area's own "reject" action for this business, with a reason such as "test business". It sets the status to `rejected`, closes the notification, writes an audit entry, and for a subscription that is not a PayMe subscription it changes nothing else (`cancelPayMeSubscriptionForRejection` only acts on `payment_provider = 'payme'`).

Equivalent guarded SQL (only if the admin action cannot be used):

```sql
do $$
declare
  v_id uuid := '<REGISTRATION ID>';
  v_owner uuid := '<TEST OWNER ID>';
  v_name text := '<EXACT TEST BUSINESS NAME>';
  r record;
begin
  select * into r from public.business_registrations where id = v_id for update;
  if not found then raise exception 'ABORT: not found'; end if;
  if r.owner_id is distinct from v_owner then raise exception 'ABORT: owner mismatch'; end if;
  if r.business_name is distinct from v_name then raise exception 'ABORT: name mismatch'; end if;
  if r.status <> 'approved' then raise exception 'ABORT: status is %, expected approved', r.status; end if;
  update public.business_registrations set status = 'rejected', rejection_reason = 'test business - hidden'
   where id = v_id and owner_id = v_owner and business_name = v_name and status = 'approved';
end $$;
```

Check afterwards (read-only): the slug page answers "unavailable" / not found, and the business is absent from the public lists. Undo: set the status back to `approved` (the subscription is untouched, so the page returns).

## Step 2 - CLEAN UP (deletes; only after Step 1 and only on the owner's instruction)

ONE atomic block: it locks the registration and verifies everything first, and raises an exception BEFORE any delete if a single condition fails. `v_since` is the time the test account was created.

```sql
do $$
declare
  v_id    uuid        := '<REGISTRATION ID>';
  v_owner uuid        := '<TEST OWNER ID>';
  v_name  text        := '<EXACT TEST BUSINESS NAME>';
  v_since timestamptz := '<TEST START, UTC>';
  r record;
  n int;
begin
  select * into r from public.business_registrations where id = v_id for update;
  if not found then raise exception 'ABORT: registration not found'; end if;
  if r.owner_id is distinct from v_owner then raise exception 'ABORT: owner mismatch'; end if;
  if r.business_name is distinct from v_name then raise exception 'ABORT: name mismatch'; end if;
  if r.status not in ('approved', 'rejected') then raise exception 'ABORT: unexpected status %', r.status; end if;
  if r.plan_tier <> 'plus' then raise exception 'ABORT: plan is %', r.plan_tier; end if;
  if r.created_at < v_since then raise exception 'ABORT: the registration predates the test'; end if;

  -- every registration of this owner is a test registration (the account is dedicated to the test)
  select count(*) into n from public.business_registrations where owner_id = v_owner and id <> v_id and business_name <> v_name;
  if n <> 0 then raise exception 'ABORT: the owner has % other non-test registration(s)', n; end if;

  -- the ONLY subscription is the card-less trial the test started
  select count(*) into n from public.business_subscriptions where business_registration_id = v_id;
  if n > 1 then raise exception 'ABORT: % subscriptions', n; end if;
  select count(*) into n from public.business_subscriptions
    where business_registration_id = v_id and (payment_provider is not null or created_at < v_since);
  if n <> 0 then raise exception 'ABORT: a subscription is not the card-less test trial'; end if;

  -- nothing money-related, nothing public beyond what the test made
  select count(*) into n from public.billing_transactions where business_registration_id = v_id;
  if n <> 0 then raise exception 'ABORT: % billing transaction(s)', n; end if;
  select count(*) into n from public.billing_events where business_registration_id = v_id;
  if n <> 0 then raise exception 'ABORT: % billing event(s)', n; end if;
  select count(*) into n from public.billing_payment_methods where business_registration_id = v_id and (provider <> 'sumit' or created_at < v_since);
  if n <> 0 then raise exception 'ABORT: an unexpected payment-method row'; end if;
  select count(*) into n from public.business_reviews where business_id = v_id;
  if n <> 0 then raise exception 'ABORT: % review(s)', n; end if;
  select count(*) into n from public.business_events_log
    where business_registration_id = v_id and (created_at < v_since or event_type not in ('trial_started', 'payment_method_added', 'subscription_canceled'));
  if n <> 0 then raise exception 'ABORT: % unexpected event(s)', n; end if;
  select count(*) into n from public.business_slug_redirects where business_id = v_id and created_at < v_since;
  if n <> 0 then raise exception 'ABORT: a slug redirect predates the test'; end if;
  select count(*) into n from public.admin_notifications
    where entity_id = v_id and (type <> 'business-registration' or entity_type <> 'business-registration' or created_at < v_since);
  if n <> 0 then raise exception 'ABORT: % unexpected notification(s)', n; end if;

  -- delete ONLY what the test created
  delete from public.admin_notifications where entity_id = v_id and entity_type = 'business-registration';
  delete from public.rate_limit_hits where rate_key like '%:' || v_owner::text and created_at >= v_since;
  delete from public.business_registrations where id = v_id and owner_id = v_owner and business_name = v_name;
  -- cascades: business_subscriptions, billing_payment_methods, business_events_log, business_slug_redirects, business_notifications

  raise notice 'cleanup done for %', v_id;
end $$;
```

Then, in this order: the storage files with `scripts/sumit-lab/e2e-registration/storage-cleanup.mjs` (list first, then `--delete`), the dedicated test accounts in Authentication -> Users (the registration is gone, so the `NO ACTION` foreign key no longer blocks), and the customer / saved card in the SUMIT test organization (UI). The audit log keeps its entries.

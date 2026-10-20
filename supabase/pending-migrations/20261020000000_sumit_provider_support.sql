-- PROPOSED migration - NOT APPLIED. Review, then run it (Supabase SQL editor / apply_migration) when you decide.
-- Purpose: let the billing tables hold a SUMIT payment provider next to PayMe, without touching any PayMe row or flow.
--
-- Safe by construction:
--   * additive only: no table or column is dropped, no data is rewritten, every existing row stays valid;
--   * all four provider CHECKs are replaced by the same check plus 'sumit';
--   * the new billing_payment_methods columns are nullable, and a new shape CHECK keeps PayMe rows exactly as they are
--     (token present) while forcing SUMIT rows to carry a customer id and NO provider_token (a SUMIT row can never store a card/token there);
--   * RLS is already enabled on these tables with no client grants (service role only); new columns inherit that.
--
-- Not needed (and therefore not added): a lease / lock column on business_subscriptions. Double-charge protection uses the
-- existing UNIQUE (provider, provider_transaction_id) on billing_transactions with a 'pending' row written BEFORE each charge
-- (key = sumit:<subscription id>:<billing period>:<attempt>). Only one writer can insert that row.

begin;

-- 1) 'sumit' becomes a valid provider ---------------------------------------------------------------------------------
alter table public.billing_events drop constraint billing_events_provider_check;
alter table public.billing_events add constraint billing_events_provider_check check (provider in ('payme', 'sumit'));

alter table public.billing_payment_methods drop constraint billing_payment_methods_provider_check;
alter table public.billing_payment_methods add constraint billing_payment_methods_provider_check check (provider in ('payme', 'sumit'));

alter table public.billing_transactions drop constraint billing_transactions_provider_check;
alter table public.billing_transactions add constraint billing_transactions_provider_check check (provider in ('payme', 'sumit'));

alter table public.business_subscriptions drop constraint business_subscriptions_payment_provider_check;
alter table public.business_subscriptions add constraint business_subscriptions_payment_provider_check check (payment_provider is null or payment_provider in ('payme', 'sumit'));

-- 2) a safe home for the SUMIT customer id; provider_token stays PayMe's alone ------------------------------------------
alter table public.billing_payment_methods
  add column provider_customer_id text,
  add column provider_payment_method_id text;

-- provider_token was NOT NULL because every row was a PayMe buyer_key. A SUMIT row has no token of ours at all
-- (charges use the card SUMIT keeps on the customer), so the column becomes nullable - but only SUMIT rows may leave it empty.
alter table public.billing_payment_methods alter column provider_token drop not null;

alter table public.billing_payment_methods add constraint billing_payment_methods_provider_shape_check check (
  (provider = 'payme' and provider_token is not null and provider_customer_id is null and provider_payment_method_id is null)
  or
  (provider = 'sumit' and provider_token is null and provider_customer_id ~ '^[0-9]{1,15}$' and (provider_payment_method_id is null or provider_payment_method_id ~ '^[0-9]{1,15}$'))
);

-- one saved SUMIT customer belongs to exactly one registration
create unique index billing_payment_methods_provider_customer_key
  on public.billing_payment_methods (provider, provider_customer_id)
  where provider_customer_id is not null;

comment on column public.billing_payment_methods.provider_customer_id is 'SUMIT CustomerID (provider = sumit). Not a secret and not card data; the card itself lives at SUMIT.';
comment on column public.billing_payment_methods.provider_payment_method_id is 'SUMIT payment-method id (provider = sumit), when SUMIT reports one.';
comment on column public.billing_payment_methods.provider_token is 'PayMe buyer_key (provider = payme) only. Must be NULL for sumit rows (enforced by billing_payment_methods_provider_shape_check). Server-only.';

-- 3) remember the provider's own payment id on a transaction, once, for reconciliation ----------------------------------
alter table public.billing_transactions add column provider_payment_id text;

create unique index billing_transactions_provider_payment_key
  on public.billing_transactions (provider, provider_payment_id)
  where provider_payment_id is not null;

comment on column public.billing_transactions.provider_payment_id is 'The provider''s payment id (SUMIT Payment.ID) once the charge answered. provider_transaction_id stays OUR idempotency key (sumit:<subscription>:<period>:<attempt>).';

commit;

-- ---------------------------------------------------------------------------------------------------------------------
-- Verification after running (read-only):
--   select conrelid::regclass::text, conname, pg_get_constraintdef(oid) from pg_constraint
--    where conname in ('billing_events_provider_check','billing_payment_methods_provider_check','billing_transactions_provider_check',
--                      'business_subscriptions_payment_provider_check','billing_payment_methods_provider_shape_check');
--   select count(*) from public.billing_payment_methods where provider = 'payme' and provider_token is null;   -- must be 0
--
-- Rollback (only while no SUMIT rows exist; otherwise delete those rows first):
--   begin;
--   drop index if exists public.billing_transactions_provider_payment_key;
--   alter table public.billing_transactions drop column if exists provider_payment_id;
--   drop index if exists public.billing_payment_methods_provider_customer_key;
--   alter table public.billing_payment_methods drop constraint billing_payment_methods_provider_shape_check;
--   alter table public.billing_payment_methods alter column provider_token set not null;
--   alter table public.billing_payment_methods drop column provider_payment_method_id, drop column provider_customer_id;
--   alter table public.billing_events drop constraint billing_events_provider_check, add constraint billing_events_provider_check check (provider = 'payme');
--   alter table public.billing_payment_methods drop constraint billing_payment_methods_provider_check, add constraint billing_payment_methods_provider_check check (provider = 'payme');
--   alter table public.billing_transactions drop constraint billing_transactions_provider_check, add constraint billing_transactions_provider_check check (provider = 'payme');
--   alter table public.business_subscriptions drop constraint business_subscriptions_payment_provider_check, add constraint business_subscriptions_payment_provider_check check (payment_provider is null or payment_provider = 'payme');
--   commit;

-- PROPOSED migration - NOT APPLIED. Review, then run it when you decide.
-- Purpose: billing_payment_methods.provider has DEFAULT 'payme'. PayMe is dormant and SUMIT is the only provider, so an
-- insert that forgets to name its provider must FAIL instead of silently becoming a PayMe row.
--
-- Preflight (read-only, done 2026-10-20 against project Neve-Shamir):
--   * the column is NOT NULL with default 'payme'::text; the table has 0 rows;
--   * no function, trigger, view, policy or other database object references the table or depends on the default;
--   * every writer in the code (2 PayMe upserts, 1 SUMIT upsert) names `provider` explicitly, and the TypeScript Insert type now REQUIRES it.
-- After this runs, an insert without provider fails with a NOT NULL violation (23502) - the intended behaviour.
-- Existing rows and the provider CHECK / shape CHECK are untouched. Nothing else changes (no data, no RLS, no other column).
--
-- Order: run it after 20261020000000_sumit_provider_support (already applied) - it does not depend on it.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- refuse to run twice (or against a table that no longer has the default)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'billing_payment_methods' and column_name = 'provider' and column_default is not null
  ) then
    raise exception 'billing_payment_methods.provider has no default - already applied? nothing was changed';
  end if;
end
$$;

alter table public.billing_payment_methods alter column provider drop default;

commit;

-- ---------------------------------------------------------------------------------------------------------------------
-- Verification after running (read-only):
--   select column_default, is_nullable from information_schema.columns
--    where table_schema = 'public' and table_name = 'billing_payment_methods' and column_name = 'provider';   -- default NULL, is_nullable NO
--
-- Rollback:
--   alter table public.billing_payment_methods alter column provider set default 'payme';

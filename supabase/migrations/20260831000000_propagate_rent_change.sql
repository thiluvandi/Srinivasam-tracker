-- When the owner edits a tenancy's rent/due-day, propagate it to any
-- monthly_ledgers row for that tenancy that is still "untouched" (no
-- confirmed payments, no adjustments) for the current month or later.
-- This fixes a gap where merely browsing to a future month via the
-- month/year picker silently pre-creates its ledger (via
-- ensure_monthly_ledger) with the rent as it stood at that moment — an
-- empty shell, not real billing history, so it shouldn't stay locked to a
-- stale rent the way a month with real activity correctly does.
create or replace function update_tenancy_terms(
  p_tenancy_id uuid,
  p_monthly_rent numeric,
  p_security_deposit numeric,
  p_lease_start_date date,
  p_lease_end_date date,
  p_rent_due_day int
)
returns void
language plpgsql
as $$
declare
  v_today date := current_date;
  v_current_year int := extract(year from v_today)::int;
  v_current_month int := extract(month from v_today)::int;
begin
  update tenancies
    set monthly_rent = p_monthly_rent,
        security_deposit = p_security_deposit,
        lease_start_date = p_lease_start_date,
        lease_end_date = p_lease_end_date,
        rent_due_day = p_rent_due_day,
        updated_at = now()
    where id = p_tenancy_id;

  update monthly_ledgers ml
    set base_rent = p_monthly_rent,
        rent_due_day = p_rent_due_day,
        updated_at = now()
    where ml.tenancy_id = p_tenancy_id
      and (ml.year > v_current_year or (ml.year = v_current_year and ml.month >= v_current_month))
      and not exists (select 1 from payments p where p.monthly_ledger_id = ml.id and p.status = 'confirmed')
      and not exists (select 1 from adjustments a where a.monthly_ledger_id = ml.id);
end;
$$;

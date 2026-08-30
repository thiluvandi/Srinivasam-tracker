-- Business-logic functions: ledger generation, water-bill splitting,
-- payment confirm/reject/edit/delete (with audit trail), tenancy end.

-- Keeps monthly_ledgers.adjustments_total in sync with its adjustment rows.
-- Adjustments are append-only (never updated/deleted by the app), so this
-- only needs to fire on insert.
create or replace function recompute_ledger_adjustments_total()
returns trigger
language plpgsql
as $$
begin
  update monthly_ledgers
    set adjustments_total = (
      select coalesce(sum(amount), 0) from adjustments where monthly_ledger_id = new.monthly_ledger_id
    ),
    updated_at = now()
    where id = new.monthly_ledger_id;
  return new;
end;
$$;

create trigger adjustments_after_insert
  after insert on adjustments
  for each row execute function recompute_ledger_adjustments_total();

-- Idempotently ensures a monthly_ledgers row exists for a tenancy + period,
-- snapshotting the rent/due-day as they stood when the ledger was created.
-- Never overwrites an existing row — historical months stay immutable even
-- if the tenancy's rent later changes.
create or replace function ensure_monthly_ledger(p_tenancy_id uuid, p_year int, p_month int)
returns uuid
language plpgsql
as $$
declare
  v_ledger_id uuid;
  v_unit_id uuid;
  v_rent numeric(12, 2);
  v_due_day int;
begin
  select id into v_ledger_id from monthly_ledgers
    where tenancy_id = p_tenancy_id and year = p_year and month = p_month;

  if v_ledger_id is not null then
    return v_ledger_id;
  end if;

  select unit_id, monthly_rent, rent_due_day into v_unit_id, v_rent, v_due_day
    from tenancies where id = p_tenancy_id;

  insert into monthly_ledgers (tenancy_id, unit_id, year, month, base_rent, rent_due_day)
  values (p_tenancy_id, v_unit_id, p_year, p_month, v_rent, v_due_day)
  returning id into v_ledger_id;

  return v_ledger_id;
end;
$$;

-- Ensures ledger rows exist for every tenancy that overlapped the given
-- property + period (active now, or ended after the period started).
create or replace function generate_monthly_ledgers_for_period(p_property_id uuid, p_year int, p_month int)
returns void
language plpgsql
as $$
declare
  v_period_start date := make_date(p_year, p_month, 1);
  v_period_end date := (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date;
  v_tenancy_id uuid;
begin
  for v_tenancy_id in
    select t.id
    from tenancies t
    join units u on u.id = t.unit_id
    where u.property_id = p_property_id
      and t.lease_start_date <= v_period_end
      and (t.move_out_date is null or t.move_out_date >= v_period_start)
  loop
    perform ensure_monthly_ledger(v_tenancy_id, p_year, p_month);
  end loop;
end;
$$;

-- Splits a property's water bill equally across every tenancy that
-- overlapped the period, snapshotting the allocation historically. Calling
-- this again for the same period (e.g. after the owner corrects occupancy)
-- recalculates from scratch — it is never triggered automatically by
-- unrelated tenant-list changes.
create or replace function set_water_bill(
  p_property_id uuid,
  p_year int,
  p_month int,
  p_total_amount numeric,
  p_bill_date date,
  p_due_date date,
  p_document_path text,
  p_notes text
)
returns uuid
language plpgsql
as $$
declare
  v_period_start date := make_date(p_year, p_month, 1);
  v_period_end date := (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date;
  v_water_bill_id uuid;
  v_count int;
  v_share numeric(12, 2);
  v_row record;
begin
  perform generate_monthly_ledgers_for_period(p_property_id, p_year, p_month);

  select count(*) into v_count
    from tenancies t
    join units u on u.id = t.unit_id
    where u.property_id = p_property_id
      and t.lease_start_date <= v_period_end
      and (t.move_out_date is null or t.move_out_date >= v_period_start);

  v_share := case when v_count > 0 then round(p_total_amount / v_count, 2) else 0 end;

  insert into water_bills (property_id, year, month, total_amount, bill_date, due_date, document_path, notes)
  values (p_property_id, p_year, p_month, p_total_amount, p_bill_date, p_due_date, p_document_path, p_notes)
  on conflict (property_id, year, month) do update
    set total_amount = excluded.total_amount,
        bill_date = excluded.bill_date,
        due_date = excluded.due_date,
        document_path = excluded.document_path,
        notes = excluded.notes,
        updated_at = now()
  returning id into v_water_bill_id;

  delete from water_allocations where water_bill_id = v_water_bill_id;

  for v_row in
    select ml.id as ledger_id, t.tenant_id as tenant_id
    from tenancies t
    join units u on u.id = t.unit_id
    join monthly_ledgers ml on ml.tenancy_id = t.id and ml.year = p_year and ml.month = p_month
    where u.property_id = p_property_id
      and t.lease_start_date <= v_period_end
      and (t.move_out_date is null or t.move_out_date >= v_period_start)
  loop
    insert into water_allocations (water_bill_id, monthly_ledger_id, tenant_id, amount)
    values (v_water_bill_id, v_row.ledger_id, v_row.tenant_id, v_share);

    update monthly_ledgers set water_charge = v_share, updated_at = now() where id = v_row.ledger_id;
  end loop;

  return v_water_bill_id;
end;
$$;

-- Confirms a payment (owner-reviewed OCR result, or a manual entry).
-- Fields may have been edited by the owner away from the OCR/original
-- values before calling this.
create or replace function confirm_payment(
  p_payment_id uuid,
  p_monthly_ledger_id uuid,
  p_tenant_id uuid,
  p_amount numeric,
  p_transaction_date date,
  p_transaction_time time,
  p_reference_number text,
  p_payer_name text,
  p_payment_method text,
  p_payment_app text
)
returns void
language plpgsql
as $$
begin
  update payments
    set monthly_ledger_id = p_monthly_ledger_id,
        tenant_id = p_tenant_id,
        amount = p_amount,
        transaction_date = p_transaction_date,
        transaction_time = p_transaction_time,
        reference_number = p_reference_number,
        payer_name = p_payer_name,
        payment_method = p_payment_method,
        payment_app = p_payment_app,
        status = 'confirmed',
        confirmed_at = now(),
        updated_at = now()
    where id = p_payment_id;
end;
$$;

create or replace function reject_payment(p_payment_id uuid)
returns void
language plpgsql
as $$
begin
  update payments set status = 'rejected', updated_at = now() where id = p_payment_id;
end;
$$;

-- Assigns a WhatsApp "unmatched" submission to a tenant/ledger the owner
-- picked manually, then leaves it in pending_review for normal confirmation.
create or replace function assign_unmatched_payment(
  p_payment_id uuid,
  p_monthly_ledger_id uuid,
  p_tenant_id uuid
)
returns void
language plpgsql
as $$
begin
  update payments
    set monthly_ledger_id = p_monthly_ledger_id,
        tenant_id = p_tenant_id,
        status = 'pending_review',
        updated_at = now()
    where id = p_payment_id;
end;
$$;

-- Edits an already-confirmed payment, leaving an audit trail entry.
create or replace function edit_confirmed_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_transaction_date date,
  p_reference_number text,
  p_payer_name text
)
returns void
language plpgsql
as $$
declare
  v_old record;
begin
  select amount, transaction_date, reference_number, payer_name into v_old
    from payments where id = p_payment_id;

  update payments
    set amount = p_amount,
        transaction_date = p_transaction_date,
        reference_number = p_reference_number,
        payer_name = p_payer_name,
        updated_at = now()
    where id = p_payment_id;

  insert into audit_logs (entity_type, entity_id, action, old_value, new_value)
  values (
    'payment', p_payment_id, 'edit',
    jsonb_build_object('amount', v_old.amount, 'transaction_date', v_old.transaction_date,
                        'reference_number', v_old.reference_number, 'payer_name', v_old.payer_name),
    jsonb_build_object('amount', p_amount, 'transaction_date', p_transaction_date,
                        'reference_number', p_reference_number, 'payer_name', p_payer_name)
  );
end;
$$;

-- Deletes an incorrectly entered payment, keeping an audit record of what
-- was removed (the row itself, plus cascaded media/OCR results, are gone).
create or replace function delete_payment(p_payment_id uuid)
returns void
language plpgsql
as $$
declare
  v_old jsonb;
begin
  select to_jsonb(p) into v_old from payments p where p.id = p_payment_id;

  if v_old is null then
    raise exception 'payment % not found', p_payment_id;
  end if;

  insert into audit_logs (entity_type, entity_id, action, old_value)
  values ('payment', p_payment_id, 'delete', v_old);

  delete from payments where id = p_payment_id;
end;
$$;

-- Ends a tenancy (move-out), freeing the unit for a new tenancy while
-- preserving the ended tenancy's full history.
create or replace function end_tenancy(
  p_tenancy_id uuid,
  p_move_out_date date,
  p_final_notes text,
  p_deposit_returned numeric,
  p_deposit_deductions numeric
)
returns void
language plpgsql
as $$
begin
  update tenancies
    set status = 'ended',
        move_out_date = p_move_out_date,
        final_notes = p_final_notes,
        deposit_returned = p_deposit_returned,
        deposit_deductions = p_deposit_deductions,
        updated_at = now()
    where id = p_tenancy_id;
end;
$$;

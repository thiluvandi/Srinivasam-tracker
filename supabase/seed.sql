-- Demo data for local development only. Exercises Paid / Overdue / Partial
-- (overdue) / Pending / Waived / Vacant so every dashboard state can be seen.
-- Assumes "today" is at or after 2026-08-30 (August's 10th due date has
-- passed; September's has not).

insert into tenants (name, phone) values
  ('Arun Kumar', '9000000001'),
  ('Meera Rao', '9000000002'),
  ('Ramesh', '9000000003'),
  ('Priya', '9000000004'),
  ('Joseph', '9000000005');

insert into tenancies (tenant_id, unit_id, lease_start_date, monthly_rent, security_deposit, status)
select t.id, u.id, '2025-01-01', v.rent, v.rent * 2, 'active'
from (values
  ('Arun Kumar', 'GF East', 20000),
  ('Meera Rao', 'GF West', 18000),
  ('Ramesh', '1st F East', 21000),
  ('Priya', '1st F West', 19000),
  ('Joseph', '2nd F East', 22000)
) as v(tenant, unit, rent)
join tenants t on t.name = v.tenant
join units u on u.name = v.unit;

-- August 2026 ledgers for the four occupied-in-August units.
select ensure_monthly_ledger(tc.id, 2026, 8)
from tenancies tc
join units u on u.id = tc.unit_id
where u.name in ('GF East', 'GF West', '1st F East', '2nd F East');

-- Arun Kumar (GF East) — paid in full.
insert into payments (monthly_ledger_id, tenant_id, amount, transaction_date, payment_method, source, status, confirmed_at)
select ml.id, ml_tenant.tenant_id, ml.total_due, '2026-08-06', 'UPI', 'manual_upload', 'confirmed', now()
from monthly_ledgers ml
join units u on u.id = ml.unit_id
join tenancies ml_tenant on ml_tenant.id = ml.tenancy_id
where u.name = 'GF East' and ml.year = 2026 and ml.month = 8;

-- Meera Rao (GF West) — nothing paid, due date passed -> Overdue.

-- Ramesh (1st F East) — partial payment, overdue balance.
insert into payments (monthly_ledger_id, tenant_id, amount, transaction_date, payment_method, source, status, confirmed_at)
select ml.id, ml_tenant.tenant_id, 10000, '2026-08-08', 'UPI', 'manual_upload', 'confirmed', now()
from monthly_ledgers ml
join units u on u.id = ml.unit_id
join tenancies ml_tenant on ml_tenant.id = ml.tenancy_id
where u.name = '1st F East' and ml.year = 2026 and ml.month = 8;

-- Joseph (2nd F East) — waived in full.
insert into adjustments (monthly_ledger_id, amount, type, reason)
select ml.id, -ml.total_due, 'waiver', 'Owner waived this month as goodwill'
from monthly_ledgers ml
join units u on u.id = ml.unit_id
where u.name = '2nd F East' and ml.year = 2026 and ml.month = 8;

-- Priya (1st F West) — September 2026 ledger, due date not yet passed -> Pending.
select ensure_monthly_ledger(tc.id, 2026, 9)
from tenancies tc
join units u on u.id = tc.unit_id
where u.name = '1st F West';

-- 2nd F West stays vacant (no tenancy).

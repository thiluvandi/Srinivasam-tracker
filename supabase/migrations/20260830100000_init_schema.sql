-- Srinivasam Rent Tracker — core schema.
-- Single owner, single property (6 fixed units), PIN auth (no Supabase Auth).
-- All access happens server-side via the service-role key, so RLS is enabled
-- with zero policies on every table: the anon/authenticated Postgres roles
-- get no access at all, and the service role bypasses RLS entirely. This is
-- intentionally stricter than Supabase-Auth-based RLS since there is no
-- per-request user JWT to key policies off in a PIN-only app.

create extension if not exists "pgcrypto";

-- ── Auth (single row: the owner's hashed PIN + lockout state) ──────────────
create table app_auth (
  id smallint primary key default 1 check (id = 1),
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- ── Property / units ────────────────────────────────────────────────────
create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  name text not null,
  floor text,
  position text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (property_id, name)
);

-- ── Tenants (profile only — rent lives on the tenancy, not the tenant) ───
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  emergency_contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenants_phone_idx on tenants (phone);

-- ── Tenancies (one occupancy stint of one tenant in one unit) ────────────
create type tenancy_status as enum ('active', 'ended');

create table tenancies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  unit_id uuid not null references units (id) on delete cascade,
  lease_start_date date not null,
  lease_end_date date,
  monthly_rent numeric(12, 2) not null check (monthly_rent >= 0),
  security_deposit numeric(12, 2) not null default 0 check (security_deposit >= 0),
  rent_due_day int not null default 10 check (rent_due_day between 1 and 28),
  status tenancy_status not null default 'active',
  move_out_date date,
  deposit_returned numeric(12, 2),
  deposit_deductions numeric(12, 2),
  final_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenancies_unit_id_idx on tenancies (unit_id);
create index tenancies_tenant_id_idx on tenancies (tenant_id);
-- Only one active tenancy per unit at a time.
create unique index tenancies_one_active_per_unit on tenancies (unit_id) where status = 'active';

-- ── Monthly ledgers (one per tenancy per calendar month, immutable snapshot) ─
create table monthly_ledgers (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies (id) on delete cascade,
  unit_id uuid not null references units (id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  base_rent numeric(12, 2) not null check (base_rent >= 0),
  water_charge numeric(12, 2) not null default 0 check (water_charge >= 0),
  adjustments_total numeric(12, 2) not null default 0,
  rent_due_day int not null default 10,
  total_due numeric(12, 2) generated always as (base_rent + water_charge + adjustments_total) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenancy_id, year, month)
);
create index monthly_ledgers_unit_id_idx on monthly_ledgers (unit_id);
create index monthly_ledgers_period_idx on monthly_ledgers (year, month);

-- ── Payments (shared by manual upload, manual entry, and future WhatsApp) ─
create type payment_source as enum ('manual_upload', 'manual_entry', 'whatsapp');
create type payment_status as enum ('pending_review', 'confirmed', 'rejected', 'unmatched');

create table payments (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: an "unmatched" WhatsApp submission has no ledger/tenant yet,
  -- until the owner assigns it from the Unmatched Payments list.
  monthly_ledger_id uuid references monthly_ledgers (id) on delete set null,
  tenant_id uuid references tenants (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  transaction_date date,
  transaction_time time,
  reference_number text,
  payer_name text,
  payee_name text,
  payment_method text,
  payment_app text,
  source payment_source not null,
  status payment_status not null default 'pending_review',
  -- WhatsApp-only: the sending phone number, kept even after matching, and
  -- especially for unmatched submissions the owner must assign manually.
  sender_phone text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_monthly_ledger_id_idx on payments (monthly_ledger_id);
create index payments_status_idx on payments (status);
create index payments_sender_phone_idx on payments (sender_phone);

create table payment_media (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);
create index payment_media_payment_id_idx on payment_media (payment_id);

create table ocr_results (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  provider text not null default 'claude',
  raw_result jsonb,
  structured_result jsonb,
  confidence numeric(4, 3),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index ocr_results_payment_id_idx on ocr_results (payment_id);

-- ── Adjustments (append-only — reverse with an offsetting row, never edit) ─
create type adjustment_type as enum ('charge', 'credit', 'waiver');

create table adjustments (
  id uuid primary key default gen_random_uuid(),
  monthly_ledger_id uuid not null references monthly_ledgers (id) on delete cascade,
  amount numeric(12, 2) not null,
  type adjustment_type not null,
  reason text not null,
  notes text,
  created_at timestamptz not null default now()
);
create index adjustments_monthly_ledger_id_idx on adjustments (monthly_ledger_id);

-- ── Water bills & their per-ledger allocation ────────────────────────────
create table water_bills (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  bill_date date,
  due_date date,
  document_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, year, month)
);

create table water_allocations (
  id uuid primary key default gen_random_uuid(),
  water_bill_id uuid not null references water_bills (id) on delete cascade,
  monthly_ledger_id uuid not null references monthly_ledgers (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (water_bill_id, monthly_ledger_id)
);

-- ── Tenant documents ──────────────────────────────────────────────────
create type tenant_document_category as enum ('rental_agreement', 'id_proof', 'deposit_receipt', 'other');

create table tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  tenancy_id uuid references tenancies (id) on delete set null,
  category tenant_document_category not null default 'other',
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  description text,
  created_at timestamptz not null default now()
);
create index tenant_documents_tenant_id_idx on tenant_documents (tenant_id);

-- ── Audit log (payment edits, adjustments reversed, etc.) ────────────────
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- Lock every table down from the anon/authenticated Postgres roles. All
-- application access goes through the service-role key server-side.
alter table app_auth enable row level security;
alter table properties enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table tenancies enable row level security;
alter table monthly_ledgers enable row level security;
alter table payments enable row level security;
alter table payment_media enable row level security;
alter table ocr_results enable row level security;
alter table adjustments enable row level security;
alter table water_bills enable row level security;
alter table water_allocations enable row level security;
alter table tenant_documents enable row level security;
alter table audit_logs enable row level security;

-- ── Seed the single property + its 6 fixed units ─────────────────────────
insert into properties (name) values ('Srinivasam');

insert into units (property_id, name, floor, position, display_order)
select p.id, u.name, u.floor, u.position, u.display_order
from properties p, (values
  ('GF East', 'Ground Floor', 'East', 1),
  ('GF West', 'Ground Floor', 'West', 2),
  ('1st F East', '1st Floor', 'East', 3),
  ('1st F West', '1st Floor', 'West', 4),
  ('2nd F East', '2nd Floor', 'East', 5),
  ('2nd F West', '2nd Floor', 'West', 6)
) as u(name, floor, position, display_order)
where p.name = 'Srinivasam';

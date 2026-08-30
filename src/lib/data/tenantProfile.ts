import { createAdminClient } from "@/lib/supabase/admin";
import { computeLedgerStatus, dueDateFor, type LedgerStatus } from "@/lib/status";

export type TenantProfile = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  emergencyContact: string | null;
  notes: string | null;
};

export type TenancyInfo = {
  id: string;
  unitId: string;
  unitName: string;
  status: "active" | "ended";
  leaseStartDate: string;
  leaseEndDate: string | null;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number;
  moveOutDate: string | null;
  depositReturned: number | null;
  depositDeductions: number | null;
  finalNotes: string | null;
};

export type PreviousTenant = {
  tenantId: string;
  tenantName: string;
  unitName: string;
  moveOutDate: string | null;
};

export type TenantDocument = {
  id: string;
  category: string;
  fileName: string;
  storagePath: string;
  description: string | null;
  createdAt: string;
};

export type TenantLedgerHistoryRow = {
  ledgerId: string;
  year: number;
  month: number;
  totalDue: number;
  paidTotal: number;
  status: LedgerStatus;
  lastPaymentDate: string | null;
};

export type TenantProfileData = {
  tenant: TenantProfile;
  tenancies: TenancyInfo[];
  previousTenants: PreviousTenant[];
  documents: TenantDocument[];
  ledgerHistory: TenantLedgerHistoryRow[];
};

export async function getTenantProfileData(tenantId: string): Promise<TenantProfileData | null> {
  const supabase = createAdminClient();

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, phone, email, emergency_contact, notes")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenantError) throw tenantError;
  if (!tenant) return null;

  // docRows only needs tenantId, same as tenancyRows — no reason to wait for
  // one before starting the other.
  const [{ data: tenancyRows, error: tenanciesError }, { data: docRows }] = await Promise.all([
    supabase
      .from("tenancies")
      .select(
        "id, unit_id, status, lease_start_date, lease_end_date, monthly_rent, security_deposit, rent_due_day, move_out_date, deposit_returned, deposit_deductions, final_notes, units(name)"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_documents")
      .select("id, category, file_name, storage_path, description, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
  ]);
  if (tenanciesError) throw tenanciesError;

  type TenancyRow = {
    id: string;
    unit_id: string;
    status: "active" | "ended";
    lease_start_date: string;
    lease_end_date: string | null;
    monthly_rent: number;
    security_deposit: number;
    rent_due_day: number;
    move_out_date: string | null;
    deposit_returned: number | null;
    deposit_deductions: number | null;
    final_notes: string | null;
    units: { name: string } | { name: string }[];
  };

  const tenancies: TenancyInfo[] = ((tenancyRows ?? []) as TenancyRow[]).map((t) => ({
    id: t.id,
    unitId: t.unit_id,
    unitName: Array.isArray(t.units) ? t.units[0]?.name : t.units?.name,
    status: t.status,
    leaseStartDate: t.lease_start_date,
    leaseEndDate: t.lease_end_date,
    monthlyRent: Number(t.monthly_rent),
    securityDeposit: Number(t.security_deposit),
    rentDueDay: t.rent_due_day,
    moveOutDate: t.move_out_date,
    depositReturned: t.deposit_returned !== null ? Number(t.deposit_returned) : null,
    depositDeductions: t.deposit_deductions !== null ? Number(t.deposit_deductions) : null,
    finalNotes: t.final_notes,
  }));

  const unitIds = [...new Set(tenancies.map((t) => t.unitId))];
  const tenancyIds = tenancies.map((t) => t.id);

  const documents: TenantDocument[] = (docRows ?? []).map((d) => ({
    id: d.id,
    category: d.category,
    fileName: d.file_name,
    storagePath: d.storage_path,
    description: d.description,
    createdAt: d.created_at,
  }));

  // Neither of these depends on the other — both only need the ids derived
  // from tenancies above.
  const [{ data: prevRows }, { data: ledgerRows }] = await Promise.all([
    unitIds.length
      ? supabase
          .from("tenancies")
          .select("unit_id, move_out_date, tenants(id, name), units(name)")
          .in("unit_id", unitIds)
          .neq("tenant_id", tenantId)
          .order("move_out_date", { ascending: false })
      : Promise.resolve({ data: [] }),
    tenancyIds.length
      ? supabase
          .from("monthly_ledgers")
          .select("id, year, month, total_due, rent_due_day")
          .in("tenancy_id", tenancyIds)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  type PrevRow = {
    unit_id: string;
    move_out_date: string | null;
    tenants: { id: string; name: string } | { id: string; name: string }[];
    units: { name: string } | { name: string }[];
  };
  const previousTenants: PreviousTenant[] = ((prevRows ?? []) as PrevRow[]).map((r) => {
    const t = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
    const u = Array.isArray(r.units) ? r.units[0] : r.units;
    return { tenantId: t?.id, tenantName: t?.name, unitName: u?.name, moveOutDate: r.move_out_date };
  });

  const ledgerIds = (ledgerRows ?? []).map((l) => l.id);
  const [{ data: paymentRows }, { data: waiverRows }] = await Promise.all([
    ledgerIds.length
      ? supabase
          .from("payments")
          .select("monthly_ledger_id, amount, transaction_date")
          .in("monthly_ledger_id", ledgerIds)
          .eq("status", "confirmed")
      : Promise.resolve({ data: [] }),
    ledgerIds.length
      ? supabase.from("adjustments").select("monthly_ledger_id").in("monthly_ledger_id", ledgerIds).eq("type", "waiver")
      : Promise.resolve({ data: [] }),
  ]);

  const paidByLedger = new Map<string, number>();
  const lastPaymentByLedger = new Map<string, string>();
  for (const p of paymentRows ?? []) {
    paidByLedger.set(p.monthly_ledger_id, (paidByLedger.get(p.monthly_ledger_id) ?? 0) + Number(p.amount));
    if (p.transaction_date) {
      const current = lastPaymentByLedger.get(p.monthly_ledger_id);
      if (!current || p.transaction_date > current) lastPaymentByLedger.set(p.monthly_ledger_id, p.transaction_date);
    }
  }
  const waiverLedgerIds = new Set((waiverRows ?? []).map((w) => w.monthly_ledger_id));

  const ledgerHistory: TenantLedgerHistoryRow[] = (ledgerRows ?? []).map((l) => {
    const paidTotal = paidByLedger.get(l.id) ?? 0;
    const { status } = computeLedgerStatus({
      totalDue: Number(l.total_due),
      paidTotal,
      hasWaiver: waiverLedgerIds.has(l.id),
      dueDate: dueDateFor(l.year, l.month, l.rent_due_day),
    });
    return {
      ledgerId: l.id,
      year: l.year,
      month: l.month,
      totalDue: Number(l.total_due),
      paidTotal,
      status,
      lastPaymentDate: lastPaymentByLedger.get(l.id) ?? null,
    };
  });

  const tenantProfile: TenantProfile = {
    id: tenant.id,
    name: tenant.name,
    phone: tenant.phone,
    email: tenant.email,
    emergencyContact: tenant.emergency_contact,
    notes: tenant.notes,
  };

  return { tenant: tenantProfile, tenancies, previousTenants, documents, ledgerHistory };
}

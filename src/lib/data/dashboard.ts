import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyId } from "@/lib/data/property";
import { computeLedgerStatus, dueDateFor, type LedgerStatus } from "@/lib/status";

export type UnitRow = {
  unitId: string;
  unitName: string;
  displayOrder: number;
  vacant: boolean;
  tenantId?: string;
  tenantName?: string;
  ledgerId?: string;
  totalDue?: number;
  paidTotal?: number;
  status?: LedgerStatus;
  balance?: number;
  isOverdueBalance?: boolean;
  lastPaymentDate?: string | null;
};

export type HomeDashboardData = {
  year: number;
  month: number;
  units: UnitRow[];
  collected: number;
  outstanding: number;
  settledCount: number;
  occupiedCount: number;
  attention: string[];
};

export async function getHomeDashboardData(year: number, month: number): Promise<HomeDashboardData> {
  const supabase = createAdminClient();
  const propertyId = await getPropertyId();

  await supabase.rpc("generate_monthly_ledgers_for_period", {
    p_property_id: propertyId,
    p_year: year,
    p_month: month,
  });

  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("id, name, display_order")
    .eq("property_id", propertyId)
    .order("display_order");
  if (unitsError) throw unitsError;

  const { data: tenancies, error: tenanciesError } = await supabase
    .from("tenancies")
    .select("id, unit_id, tenant_id, tenants(name)")
    .lte("lease_start_date", periodEnd)
    .or(`move_out_date.is.null,move_out_date.gte.${periodStart}`);
  if (tenanciesError) throw tenanciesError;

  type TenancyRow = { id: string; unit_id: string; tenant_id: string; tenants: { name: string } | { name: string }[] };
  const tenancyByUnit = new Map<string, TenancyRow>();
  for (const t of (tenancies ?? []) as TenancyRow[]) {
    tenancyByUnit.set(t.unit_id, t);
  }

  const tenancyIds = [...tenancyByUnit.values()].map((t) => t.id);

  const { data: ledgers, error: ledgersError } = tenancyIds.length
    ? await supabase
        .from("monthly_ledgers")
        .select("id, tenancy_id, base_rent, water_charge, adjustments_total, total_due, rent_due_day")
        .in("tenancy_id", tenancyIds)
        .eq("year", year)
        .eq("month", month)
    : { data: [], error: null };
  if (ledgersError) throw ledgersError;

  const ledgerByTenancy = new Map((ledgers ?? []).map((l) => [l.tenancy_id, l]));
  const ledgerIds = (ledgers ?? []).map((l) => l.id);

  const [{ data: payments, error: paymentsError }, { data: waivers, error: waiversError }] = await Promise.all([
    ledgerIds.length
      ? supabase
          .from("payments")
          .select("monthly_ledger_id, amount, transaction_date")
          .in("monthly_ledger_id", ledgerIds)
          .eq("status", "confirmed")
      : Promise.resolve({ data: [], error: null }),
    ledgerIds.length
      ? supabase.from("adjustments").select("monthly_ledger_id").in("monthly_ledger_id", ledgerIds).eq("type", "waiver")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (paymentsError) throw paymentsError;
  if (waiversError) throw waiversError;

  const paidByLedger = new Map<string, number>();
  const lastPaymentByLedger = new Map<string, string>();
  for (const p of payments ?? []) {
    paidByLedger.set(p.monthly_ledger_id, (paidByLedger.get(p.monthly_ledger_id) ?? 0) + Number(p.amount));
    if (p.transaction_date) {
      const current = lastPaymentByLedger.get(p.monthly_ledger_id);
      if (!current || p.transaction_date > current) lastPaymentByLedger.set(p.monthly_ledger_id, p.transaction_date);
    }
  }
  const waiverLedgerIds = new Set((waivers ?? []).map((w) => w.monthly_ledger_id));

  const rows: UnitRow[] = (units ?? []).map((u) => {
    const tenancy = tenancyByUnit.get(u.id);
    if (!tenancy) {
      return { unitId: u.id, unitName: u.name, displayOrder: u.display_order, vacant: true };
    }

    const ledger = ledgerByTenancy.get(tenancy.id);
    const tenantName = Array.isArray(tenancy.tenants) ? tenancy.tenants[0]?.name : tenancy.tenants?.name;

    if (!ledger) {
      return {
        unitId: u.id,
        unitName: u.name,
        displayOrder: u.display_order,
        vacant: false,
        tenantId: tenancy.tenant_id,
        tenantName,
      };
    }

    const paidTotal = paidByLedger.get(ledger.id) ?? 0;
    const { status, balance, isOverdueBalance } = computeLedgerStatus({
      totalDue: Number(ledger.total_due),
      paidTotal,
      hasWaiver: waiverLedgerIds.has(ledger.id),
      dueDate: dueDateFor(year, month, ledger.rent_due_day),
    });

    return {
      unitId: u.id,
      unitName: u.name,
      displayOrder: u.display_order,
      vacant: false,
      tenantId: tenancy.tenant_id,
      tenantName,
      ledgerId: ledger.id,
      totalDue: Number(ledger.total_due),
      paidTotal,
      status,
      balance,
      isOverdueBalance,
      lastPaymentDate: lastPaymentByLedger.get(ledger.id) ?? null,
    };
  });

  const occupiedRows = rows.filter((r) => !r.vacant && r.ledgerId);
  const collected = occupiedRows.reduce((sum, r) => sum + (r.paidTotal ?? 0), 0);
  const outstanding = occupiedRows.reduce((sum, r) => sum + Math.max(r.balance ?? 0, 0), 0);
  const settledCount = occupiedRows.filter((r) => r.status === "paid" || r.status === "waived").length;

  const attention: string[] = [];
  const overdueCount = occupiedRows.filter((r) => r.status === "overdue").length;
  if (overdueCount > 0) attention.push(`${overdueCount} tenant${overdueCount === 1 ? "" : "s"} overdue`);

  const { count: needsReviewCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review")
    .not("monthly_ledger_id", "is", null);
  if (needsReviewCount) attention.push(`${needsReviewCount} payment${needsReviewCount === 1 ? "" : "s"} needs verification`);

  const { count: unmatchedCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "unmatched");
  if (unmatchedCount) attention.push(`${unmatchedCount} unmatched payment${unmatchedCount === 1 ? "" : "s"}`);

  const { data: waterBill } = await supabase
    .from("water_bills")
    .select("id")
    .eq("property_id", propertyId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long" });
  if (!waterBill && occupiedRows.length > 0) attention.push(`Water bill not entered for ${monthName}`);

  return {
    year,
    month,
    units: rows,
    collected,
    outstanding,
    settledCount,
    occupiedCount: occupiedRows.length,
    attention,
  };
}

import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyId } from "@/lib/data/property";
import { computeLedgerStatus, dueDateFor } from "@/lib/status";

export type MonthlySummary = {
  expected: number;
  water: number;
  adjustments: number;
  totalDue: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
  counts: { paid: number; partial: number; overdue: number; pending: number; waived: number; vacant: number };
};

export async function getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
  const supabase = createAdminClient();
  const propertyId = await getPropertyId();

  await supabase.rpc("generate_monthly_ledgers_for_period", { p_property_id: propertyId, p_year: year, p_month: month });

  const { data: units } = await supabase.from("units").select("id").eq("property_id", propertyId);
  const unitIds = (units ?? []).map((u) => u.id);

  const { data: ledgers } = unitIds.length
    ? await supabase
        .from("monthly_ledgers")
        .select("id, base_rent, water_charge, adjustments_total, total_due, rent_due_day")
        .in("unit_id", unitIds)
        .eq("year", year)
        .eq("month", month)
    : { data: [] };

  const ledgerIds = (ledgers ?? []).map((l) => l.id);
  const [{ data: payments }, { data: waivers }] = await Promise.all([
    ledgerIds.length
      ? supabase.from("payments").select("monthly_ledger_id, amount").in("monthly_ledger_id", ledgerIds).eq("status", "confirmed")
      : Promise.resolve({ data: [] }),
    ledgerIds.length
      ? supabase.from("adjustments").select("monthly_ledger_id").in("monthly_ledger_id", ledgerIds).eq("type", "waiver")
      : Promise.resolve({ data: [] }),
  ]);

  const paidByLedger = new Map<string, number>();
  for (const p of payments ?? []) paidByLedger.set(p.monthly_ledger_id, (paidByLedger.get(p.monthly_ledger_id) ?? 0) + Number(p.amount));
  const waiverIds = new Set((waivers ?? []).map((w) => w.monthly_ledger_id));

  let expected = 0, water = 0, adjustments = 0, totalDue = 0, collected = 0, outstanding = 0;
  const counts = { paid: 0, partial: 0, overdue: 0, pending: 0, waived: 0, vacant: (units?.length ?? 0) - (ledgers?.length ?? 0) };

  for (const l of ledgers ?? []) {
    expected += Number(l.base_rent);
    water += Number(l.water_charge);
    adjustments += Number(l.adjustments_total);
    totalDue += Number(l.total_due);
    const paidTotal = paidByLedger.get(l.id) ?? 0;
    collected += paidTotal;
    const { status, balance } = computeLedgerStatus({
      totalDue: Number(l.total_due), paidTotal, hasWaiver: waiverIds.has(l.id),
      dueDate: dueDateFor(year, month, l.rent_due_day),
    });
    outstanding += Math.max(balance, 0);
    counts[status] += 1;
  }

  return {
    expected, water, adjustments, totalDue, collected, outstanding,
    collectionRate: totalDue > 0 ? Math.round((collected / totalDue) * 100) : 100,
    counts,
  };
}

export function financialYearRange(fyStartYear: number): { start: [number, number]; end: [number, number] } {
  return { start: [fyStartYear, 4], end: [fyStartYear + 1, 3] };
}

export async function getFinancialYearSummary(fyStartYear: number) {
  const supabase = createAdminClient();
  const propertyId = await getPropertyId();
  const { data: units } = await supabase.from("units").select("id").eq("property_id", propertyId);
  const unitIds = (units ?? []).map((u) => u.id);

  const periods = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const m = 4 + i;
    const year = m <= 12 ? fyStartYear : fyStartYear + 1;
    const month = m <= 12 ? m : m - 12;
    periods.add(`${year}-${month}`);
  }

  // The FY spans at most two calendar years, so one query covering both
  // (filtered down to the 12 target months in JS) replaces what was 12
  // separate per-month round-trips.
  const { data: ledgers } = unitIds.length
    ? await supabase
        .from("monthly_ledgers")
        .select("id, year, month, base_rent, water_charge, total_due")
        .in("unit_id", unitIds)
        .in("year", [fyStartYear, fyStartYear + 1])
    : { data: [] };

  const fyLedgers = (ledgers ?? []).filter((l) => periods.has(`${l.year}-${l.month}`));
  const ledgerIds = fyLedgers.map((l) => l.id);

  const { data: payments } = ledgerIds.length
    ? await supabase
        .from("payments")
        .select("monthly_ledger_id, amount")
        .in("monthly_ledger_id", ledgerIds)
        .eq("status", "confirmed")
    : { data: [] };

  const paidByLedger = new Map<string, number>();
  for (const pay of payments ?? []) {
    paidByLedger.set(pay.monthly_ledger_id, (paidByLedger.get(pay.monthly_ledger_id) ?? 0) + Number(pay.amount));
  }

  let totalRent = 0, totalCollected = 0, totalOutstanding = 0, totalWater = 0;
  for (const l of fyLedgers) {
    totalRent += Number(l.base_rent);
    totalWater += Number(l.water_charge);
    const paidTotal = paidByLedger.get(l.id) ?? 0;
    totalCollected += paidTotal;
    totalOutstanding += Math.max(Number(l.total_due) - paidTotal, 0);
  }

  return { totalRent, totalCollected, totalOutstanding, totalWater };
}

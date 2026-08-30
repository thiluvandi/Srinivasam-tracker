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

  const periods: { year: number; month: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = 4 + i;
    if (m <= 12) periods.push({ year: fyStartYear, month: m });
    else periods.push({ year: fyStartYear + 1, month: m - 12 });
  }

  let totalRent = 0, totalCollected = 0, totalOutstanding = 0, totalWater = 0;

  for (const p of periods) {
    const { data: ledgers } = unitIds.length
      ? await supabase
          .from("monthly_ledgers")
          .select("id, base_rent, water_charge, adjustments_total, total_due, rent_due_day")
          .in("unit_id", unitIds)
          .eq("year", p.year)
          .eq("month", p.month)
      : { data: [] };
    if (!ledgers || ledgers.length === 0) continue;

    const ledgerIds = ledgers.map((l) => l.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("monthly_ledger_id, amount")
      .in("monthly_ledger_id", ledgerIds)
      .eq("status", "confirmed");

    const paidByLedger = new Map<string, number>();
    for (const pay of payments ?? []) paidByLedger.set(pay.monthly_ledger_id, (paidByLedger.get(pay.monthly_ledger_id) ?? 0) + Number(pay.amount));

    for (const l of ledgers) {
      totalRent += Number(l.base_rent);
      totalWater += Number(l.water_charge);
      const paidTotal = paidByLedger.get(l.id) ?? 0;
      totalCollected += paidTotal;
      totalOutstanding += Math.max(Number(l.total_due) - paidTotal, 0);
    }
  }

  return { totalRent, totalCollected, totalOutstanding, totalWater };
}

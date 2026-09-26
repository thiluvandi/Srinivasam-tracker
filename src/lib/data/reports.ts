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

  // The units count (for the vacant tally) is independent of the ledger
  // generation, so it rides along with the RPC instead of queuing behind it.
  const [, { data: units }] = await Promise.all([
    supabase.rpc("generate_monthly_ledgers_for_period", { p_property_id: propertyId, p_year: year, p_month: month }),
    supabase.from("units").select("id").eq("property_id", propertyId),
  ]);

  // Ledgers + their payments + their adjustments in one round-trip, instead
  // of fetching ledgers, then their ids, then two id-keyed queries.
  type LedgerRow = {
    id: string;
    base_rent: number;
    water_charge: number;
    adjustments_total: number;
    total_due: number;
    rent_due_day: number;
    payments: { amount: number; status: string }[];
    adjustments: { type: string }[];
  };

  const { data: ledgerRows } = await supabase
    .from("monthly_ledgers")
    .select(
      "id, base_rent, water_charge, adjustments_total, total_due, rent_due_day, units!inner(property_id), payments(amount, status), adjustments(type)"
    )
    .eq("year", year)
    .eq("month", month)
    .eq("units.property_id", propertyId);

  const ledgers = (ledgerRows ?? []) as unknown as LedgerRow[];

  const paidByLedger = new Map<string, number>();
  const waiverIds = new Set<string>();
  for (const l of ledgers) {
    paidByLedger.set(
      l.id,
      (l.payments ?? []).reduce((sum, p) => (p.status === "confirmed" ? sum + Number(p.amount) : sum), 0)
    );
    if ((l.adjustments ?? []).some((a) => a.type === "waiver")) waiverIds.add(l.id);
  }

  let expected = 0, water = 0, adjustments = 0, totalDue = 0, collected = 0, outstanding = 0;
  const counts = { paid: 0, partial: 0, overdue: 0, pending: 0, waived: 0, vacant: (units?.length ?? 0) - ledgers.length };

  for (const l of ledgers) {
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

  const periods = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const m = 4 + i;
    const year = m <= 12 ? fyStartYear : fyStartYear + 1;
    const month = m <= 12 ? m : m - 12;
    periods.add(`${year}-${month}`);
  }

  // The FY spans at most two calendar years, so one query covering both
  // (filtered down to the 12 target months in JS) replaces what was 12
  // separate per-month round-trips — and embedding payments here removes
  // the follow-up query that used to wait on the ledger ids.
  type FyLedgerRow = {
    id: string;
    year: number;
    month: number;
    base_rent: number;
    water_charge: number;
    total_due: number;
    payments: { amount: number; status: string }[];
  };

  const { data: ledgerRows } = await supabase
    .from("monthly_ledgers")
    .select("id, year, month, base_rent, water_charge, total_due, units!inner(property_id), payments(amount, status)")
    .in("year", [fyStartYear, fyStartYear + 1])
    .eq("units.property_id", propertyId);

  const fyLedgers = ((ledgerRows ?? []) as unknown as FyLedgerRow[]).filter((l) =>
    periods.has(`${l.year}-${l.month}`)
  );

  let totalRent = 0, totalCollected = 0, totalOutstanding = 0, totalWater = 0;
  for (const l of fyLedgers) {
    totalRent += Number(l.base_rent);
    totalWater += Number(l.water_charge);
    const paidTotal = (l.payments ?? []).reduce(
      (sum, p) => (p.status === "confirmed" ? sum + Number(p.amount) : sum),
      0
    );
    totalCollected += paidTotal;
    totalOutstanding += Math.max(Number(l.total_due) - paidTotal, 0);
  }

  return { totalRent, totalCollected, totalOutstanding, totalWater };
}

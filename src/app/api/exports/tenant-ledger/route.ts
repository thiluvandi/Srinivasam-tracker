import { createAdminClient } from "@/lib/supabase/admin";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = createAdminClient();

  const { data: ledgers } = await supabase
    .from("monthly_ledgers")
    .select("year, month, base_rent, water_charge, adjustments_total, total_due, id, units(name), tenancies(tenants(name))")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  const ledgerIds = (ledgers ?? []).map((l) => l.id);
  const { data: payments } = ledgerIds.length
    ? await supabase.from("payments").select("monthly_ledger_id, amount").in("monthly_ledger_id", ledgerIds).eq("status", "confirmed")
    : { data: [] };
  const paidByLedger = new Map<string, number>();
  for (const p of payments ?? []) paidByLedger.set(p.monthly_ledger_id, (paidByLedger.get(p.monthly_ledger_id) ?? 0) + Number(p.amount));

  type L = {
    id: string; year: number; month: number; base_rent: number; water_charge: number; adjustments_total: number; total_due: number;
    units: { name: string } | { name: string }[];
    tenancies: { tenants: { name: string } | { name: string }[] } | { tenants: { name: string } | { name: string }[] }[];
  };

  const rows = ((ledgers ?? []) as L[]).map((l) => {
    const unit = Array.isArray(l.units) ? l.units[0] : l.units;
    const tenancy = Array.isArray(l.tenancies) ? l.tenancies[0] : l.tenancies;
    const tenant = tenancy ? (Array.isArray(tenancy.tenants) ? tenancy.tenants[0] : tenancy.tenants) : null;
    const paid = paidByLedger.get(l.id) ?? 0;
    return {
      Year: l.year,
      Month: l.month,
      Unit: unit?.name ?? "",
      Tenant: tenant?.name ?? "",
      Rent: Number(l.base_rent),
      Water: Number(l.water_charge),
      Adjustments: Number(l.adjustments_total),
      "Total Due": Number(l.total_due),
      Paid: paid,
      Balance: Math.max(Number(l.total_due) - paid, 0),
    };
  });

  return csvResponse("tenant-ledger.csv", toCsv(rows));
}

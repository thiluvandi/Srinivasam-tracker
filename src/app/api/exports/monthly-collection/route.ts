import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyId } from "@/lib/data/property";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  const supabase = createAdminClient();
  const propertyId = await getPropertyId();

  const { data: units } = await supabase.from("units").select("id, name").eq("property_id", propertyId);
  const unitIds = (units ?? []).map((u) => u.id);
  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));

  const { data: ledgers } = unitIds.length
    ? await supabase
        .from("monthly_ledgers")
        .select("id, unit_id, base_rent, water_charge, adjustments_total, total_due, tenancies(tenants(name))")
        .in("unit_id", unitIds)
        .eq("year", year)
        .eq("month", month)
    : { data: [] };

  const ledgerIds = (ledgers ?? []).map((l) => l.id);
  const { data: payments } = ledgerIds.length
    ? await supabase.from("payments").select("monthly_ledger_id, amount").in("monthly_ledger_id", ledgerIds).eq("status", "confirmed")
    : { data: [] };
  const paidByLedger = new Map<string, number>();
  for (const p of payments ?? []) paidByLedger.set(p.monthly_ledger_id, (paidByLedger.get(p.monthly_ledger_id) ?? 0) + Number(p.amount));

  type L = { id: string; unit_id: string; base_rent: number; water_charge: number; adjustments_total: number; total_due: number; tenancies: { tenants: { name: string } | { name: string }[] } | { tenants: { name: string } | { name: string }[] }[] };

  const rows = ((ledgers ?? []) as L[]).map((l) => {
    const tenancy = Array.isArray(l.tenancies) ? l.tenancies[0] : l.tenancies;
    const tenant = tenancy ? (Array.isArray(tenancy.tenants) ? tenancy.tenants[0] : tenancy.tenants) : null;
    const paid = paidByLedger.get(l.id) ?? 0;
    return {
      Unit: unitNameById.get(l.unit_id) ?? "",
      Tenant: tenant?.name ?? "",
      Rent: Number(l.base_rent),
      Water: Number(l.water_charge),
      Adjustments: Number(l.adjustments_total),
      "Total Due": Number(l.total_due),
      Collected: paid,
      Outstanding: Math.max(Number(l.total_due) - paid, 0),
    };
  });

  return csvResponse(`monthly-collection-${year}-${month}.csv`, toCsv(rows));
}

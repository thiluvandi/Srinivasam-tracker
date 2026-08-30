import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyId } from "@/lib/data/property";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  const supabase = createAdminClient();
  const propertyId = await getPropertyId();

  const { data: bill } = await supabase
    .from("water_bills")
    .select("id, total_amount")
    .eq("property_id", propertyId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (!bill) return csvResponse(`water-allocation-${year}-${month}.csv`, "");

  const { data: allocations } = await supabase
    .from("water_allocations")
    .select("amount, tenants(name), monthly_ledgers(units(name))")
    .eq("water_bill_id", bill.id);

  type Row = { amount: number; tenants: { name: string } | { name: string }[]; monthly_ledgers: { units: { name: string } | { name: string }[] } | { units: { name: string } | { name: string }[] }[] };

  const rows = ((allocations ?? []) as Row[]).map((r) => {
    const tenant = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
    const ledger = Array.isArray(r.monthly_ledgers) ? r.monthly_ledgers[0] : r.monthly_ledgers;
    const unit = ledger ? (Array.isArray(ledger.units) ? ledger.units[0] : ledger.units) : null;
    return { Unit: unit?.name ?? "", Tenant: tenant?.name ?? "", Amount: Number(r.amount) };
  });

  return csvResponse(`water-allocation-${year}-${month}.csv`, toCsv(rows));
}

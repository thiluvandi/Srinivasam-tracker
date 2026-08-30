import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyId } from "@/lib/data/property";

export type WaterBillData = {
  id: string | null;
  totalAmount: number | null;
  billDate: string | null;
  dueDate: string | null;
  notes: string | null;
  allocations: { tenantName: string; unitName: string; amount: number }[];
};

export async function getWaterBillData(year: number, month: number): Promise<WaterBillData> {
  const supabase = createAdminClient();
  const propertyId = await getPropertyId();

  const { data: bill } = await supabase
    .from("water_bills")
    .select("id, total_amount, bill_date, due_date, notes")
    .eq("property_id", propertyId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (!bill) {
    return { id: null, totalAmount: null, billDate: null, dueDate: null, notes: null, allocations: [] };
  }

  const { data: allocationRows } = await supabase
    .from("water_allocations")
    .select("amount, tenants(name), monthly_ledgers(units(name))")
    .eq("water_bill_id", bill.id);

  type Row = { amount: number; tenants: { name: string } | { name: string }[]; monthly_ledgers: { units: { name: string } | { name: string }[] } | { units: { name: string } | { name: string }[] }[] };
  const allocations = ((allocationRows ?? []) as Row[]).map((r) => {
    const tenant = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
    const ledger = Array.isArray(r.monthly_ledgers) ? r.monthly_ledgers[0] : r.monthly_ledgers;
    const unit = ledger ? (Array.isArray(ledger.units) ? ledger.units[0] : ledger.units) : null;
    return { tenantName: tenant?.name ?? "", unitName: unit?.name ?? "", amount: Number(r.amount) };
  });

  return {
    id: bill.id,
    totalAmount: Number(bill.total_amount),
    billDate: bill.bill_date,
    dueDate: bill.due_date,
    notes: bill.notes,
    allocations,
  };
}

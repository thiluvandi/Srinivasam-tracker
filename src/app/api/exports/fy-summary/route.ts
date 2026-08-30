import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyId } from "@/lib/data/property";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fyStartYear = Number(searchParams.get("fy"));

  const supabase = createAdminClient();
  const propertyId = await getPropertyId();
  const { data: units } = await supabase.from("units").select("id").eq("property_id", propertyId);
  const unitIds = (units ?? []).map((u) => u.id);

  const periods: { year: number; month: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = 4 + i;
    periods.push(m <= 12 ? { year: fyStartYear, month: m } : { year: fyStartYear + 1, month: m - 12 });
  }

  const rows = [];
  for (const p of periods) {
    const { data: ledgers } = unitIds.length
      ? await supabase
          .from("monthly_ledgers")
          .select("id, base_rent, water_charge, total_due")
          .in("unit_id", unitIds)
          .eq("year", p.year)
          .eq("month", p.month)
      : { data: [] };
    if (!ledgers || ledgers.length === 0) continue;

    const ledgerIds = ledgers.map((l) => l.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .in("monthly_ledger_id", ledgerIds)
      .eq("status", "confirmed");

    const rent = ledgers.reduce((s, l) => s + Number(l.base_rent), 0);
    const water = ledgers.reduce((s, l) => s + Number(l.water_charge), 0);
    const totalDue = ledgers.reduce((s, l) => s + Number(l.total_due), 0);
    const collected = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

    rows.push({
      Year: p.year,
      Month: p.month,
      Rent: rent,
      Water: water,
      "Total Due": totalDue,
      Collected: collected,
      Outstanding: Math.max(totalDue - collected, 0),
    });
  }

  return csvResponse(`fy-summary-${fyStartYear}.csv`, toCsv(rows));
}

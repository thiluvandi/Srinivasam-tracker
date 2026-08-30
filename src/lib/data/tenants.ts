import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyId } from "@/lib/data/property";

export type TenantsListRow = {
  unitId: string;
  unitName: string;
  displayOrder: number;
  tenancyId?: string;
  tenantId?: string;
  tenantName?: string;
  monthlyRent?: number;
};

export async function getTenantsListData(): Promise<TenantsListRow[]> {
  const supabase = createAdminClient();
  const propertyId = await getPropertyId();

  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("id, name, display_order")
    .eq("property_id", propertyId)
    .order("display_order");
  if (unitsError) throw unitsError;

  const { data: tenancies, error: tenanciesError } = await supabase
    .from("tenancies")
    .select("id, unit_id, tenant_id, monthly_rent, tenants(name)")
    .eq("status", "active");
  if (tenanciesError) throw tenanciesError;

  type Row = { id: string; unit_id: string; tenant_id: string; monthly_rent: number; tenants: { name: string } | { name: string }[] };
  const tenancyByUnit = new Map<string, Row>();
  for (const t of (tenancies ?? []) as Row[]) tenancyByUnit.set(t.unit_id, t);

  return (units ?? []).map((u) => {
    const t = tenancyByUnit.get(u.id);
    if (!t) return { unitId: u.id, unitName: u.name, displayOrder: u.display_order };
    const tenantName = Array.isArray(t.tenants) ? t.tenants[0]?.name : t.tenants?.name;
    return {
      unitId: u.id,
      unitName: u.name,
      displayOrder: u.display_order,
      tenancyId: t.id,
      tenantId: t.tenant_id,
      tenantName,
      monthlyRent: Number(t.monthly_rent),
    };
  });
}

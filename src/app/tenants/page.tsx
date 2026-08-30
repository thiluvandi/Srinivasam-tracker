import Link from "next/link";
import { getTenantsListData } from "@/lib/data/tenants";
import { currency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const units = await getTenantsListData();

  return (
    <div className="px-5 pb-8 pt-8">
      <p className="text-xl font-semibold tracking-tight text-[#2A2724]">Tenants</p>

      <div className="mt-6 space-y-3">
        {units
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((unit) => (
            <Link
              key={unit.unitId}
              href={unit.tenantId ? `/tenants/${unit.tenantId}` : `/tenants/new?unit=${unit.unitId}`}
              className="block rounded-2xl border border-[#E4E0D6] bg-white p-4"
            >
              <p className="text-sm font-medium text-[#2A2724]">{unit.unitName}</p>
              {unit.tenantId ? (
                <>
                  <p className="mt-1 text-sm text-[#8A8478]">{unit.tenantName}</p>
                  <p className="mt-2 text-sm text-[#2A2724]">{currency(unit.monthlyRent ?? 0)}/month</p>
                  <p className="mt-1 text-xs text-[#7C9473]">Active</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-[#A39D8E]">Vacant — tap to add a tenant</p>
              )}
            </Link>
          ))}
      </div>
    </div>
  );
}

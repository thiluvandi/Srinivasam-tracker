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
            <div key={unit.unitId} className="relative rounded-2xl border border-[#E4E0D6] bg-white p-4">
              <Link
                href={unit.tenantId ? `/tenants/${unit.tenantId}` : `/tenants/new?unit=${unit.unitId}`}
                className="block pr-8"
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

              {unit.tenantId && (
                <Link
                  href={`/tenants/${unit.tenantId}/edit`}
                  aria-label="Edit tenant details"
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#A39D8E] hover:bg-[#F2EFE7] hover:text-[#2A2724]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M4 20L4.6 16.7C4.7 16.1 5 15.6 5.4 15.2L15.6 5C16.4 4.2 17.7 4.2 18.5 5L19 5.5C19.8 6.3 19.8 7.6 19 8.4L8.8 18.6C8.4 19 7.9 19.3 7.3 19.4L4 20Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path d="M14 6.5L17.5 10" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </Link>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

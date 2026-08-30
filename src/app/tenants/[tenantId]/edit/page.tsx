import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantProfileData } from "@/lib/data/tenantProfile";
import { updateTenant } from "../../actions";

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm text-[#2A2724] focus:border-[#B9C4B0] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#2A2724]";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const data = await getTenantProfileData(tenantId);
  if (!data) notFound();

  const { tenant, tenancies } = data;
  const activeTenancy = tenancies.find((t) => t.status === "active");

  return (
    <div className="px-5 pb-8 pt-8">
      <Link href={`/tenants/${tenant.id}`} className="text-sm text-[#8A8478]">
        ‹ {tenant.name}
      </Link>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#2A2724]">Edit Tenant</p>
      {activeTenancy && <p className="mt-1 text-sm text-[#8A8478]">{activeTenancy.unitName}</p>}

      <form action={updateTenant} className="mt-6 space-y-4">
        <input type="hidden" name="tenantId" value={tenant.id} />
        {activeTenancy && <input type="hidden" name="tenancyId" value={activeTenancy.id} />}

        <div>
          <label className={labelClass}>Name</label>
          <input type="text" name="name" defaultValue={tenant.name} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input type="tel" name="phone" defaultValue={tenant.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" name="email" defaultValue={tenant.email ?? ""} className={inputClass} />
        </div>

        {activeTenancy && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Monthly Rent</label>
                <input
                  type="number"
                  step="0.01"
                  name="monthlyRent"
                  defaultValue={activeTenancy.monthlyRent}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Deposit</label>
                <input
                  type="number"
                  step="0.01"
                  name="securityDeposit"
                  defaultValue={activeTenancy.securityDeposit}
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Lease Start Date</label>
              <input
                type="date"
                name="leaseStartDate"
                defaultValue={activeTenancy.leaseStartDate}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Lease End Date</label>
              <input type="date" name="leaseEndDate" defaultValue={activeTenancy.leaseEndDate ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rent Due Day</label>
              <input
                type="number"
                name="rentDueDay"
                min={1}
                max={28}
                defaultValue={activeTenancy.rentDueDay}
                className={inputClass}
              />
            </div>
            <p className="text-xs text-[#A39D8E]">
              Changes to rent apply from the next month onward — past months keep the amount they were billed at.
            </p>
          </>
        )}

        <div>
          <label className={labelClass}>Emergency Contact</label>
          <input type="text" name="emergencyContact" defaultValue={tenant.emergencyContact ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea name="notes" rows={3} defaultValue={tenant.notes ?? ""} className={inputClass} />
        </div>

        <button type="submit" className="w-full rounded-xl bg-[#2A2724] px-4 py-3 text-sm font-medium text-white">
          Save Changes
        </button>
      </form>
    </div>
  );
}

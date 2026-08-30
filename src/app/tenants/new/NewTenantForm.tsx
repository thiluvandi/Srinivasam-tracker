"use client";

import { useState } from "react";
import { createTenant } from "../actions";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm text-[#2A2724] focus:border-[#B9C4B0] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#2A2724]";

export function NewTenantForm({ unitId }: { unitId: string }) {
  const [showMore, setShowMore] = useState(false);

  return (
    <form action={createTenant} className="mt-6 space-y-4">
      <input type="hidden" name="unitId" value={unitId} />

      <div>
        <label className={labelClass}>Name</label>
        <input type="text" name="name" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input type="tel" name="phone" required className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Monthly Rent</label>
          <input type="number" step="0.01" name="monthlyRent" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Deposit</label>
          <input type="number" step="0.01" name="securityDeposit" defaultValue={0} required className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Lease Start Date</label>
        <input type="date" name="leaseStartDate" defaultValue={today()} required className={inputClass} />
      </div>

      {showMore ? (
        <div className="space-y-4 border-t border-[#E4E0D6] pt-4">
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" name="email" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Lease End Date</label>
            <input type="date" name="leaseEndDate" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rent Due Day</label>
            <input type="number" name="rentDueDay" min={1} max={28} defaultValue={10} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Emergency Contact</label>
            <input type="text" name="emergencyContact" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea name="notes" rows={3} className={inputClass} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="text-sm font-medium text-[#7C93A8]"
        >
          Add more details
        </button>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-[#2A2724] px-4 py-3 text-sm font-medium text-white"
      >
        Add Tenant
      </button>
    </form>
  );
}

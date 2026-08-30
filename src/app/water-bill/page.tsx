import Link from "next/link";
import { getWaterBillData } from "@/lib/data/waterBill";
import { currency } from "@/lib/currency";
import { MONTH_NAMES } from "@/lib/status";
import { saveWaterBill } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm text-[#2A2724] focus:border-[#B9C4B0] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#8A8478]";

export default async function WaterBillPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;

  const bill = await getWaterBillData(year, month);

  return (
    <div className="px-5 pb-8 pt-8">
      <Link href="/more" className="text-sm text-[#8A8478]">
        ‹ More
      </Link>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#2A2724]">Water Bill</p>
      <p className="text-sm text-[#8A8478]">
        {MONTH_NAMES[month - 1]} {year}
      </p>

      <form action={saveWaterBill} className="mt-6 space-y-3 rounded-2xl border border-[#E4E0D6] bg-white p-4">
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        <div>
          <label className={labelClass}>Total bill amount</label>
          <input type="number" step="0.01" name="totalAmount" defaultValue={bill.totalAmount ?? ""} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Bill date (optional)</label>
          <input type="date" name="billDate" defaultValue={bill.billDate ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Due date (optional)</label>
          <input type="date" name="dueDate" defaultValue={bill.dueDate ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Bill document (optional)</label>
          <input type="file" name="document" accept="application/pdf,image/png,image/jpeg" className="mt-1 w-full text-xs text-[#8A8478]" />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea name="notes" rows={2} defaultValue={bill.notes ?? ""} className={inputClass} />
        </div>
        <button type="submit" className="w-full rounded-xl bg-[#2A2724] px-4 py-3 text-sm font-medium text-white">
          {bill.id ? "Update Water Bill" : "Add Water Bill"}
        </button>
      </form>

      {bill.allocations.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-[#2A2724]">
            {currency(bill.totalAmount ?? 0)} · {bill.allocations.length} active tenants ·{" "}
            {currency((bill.totalAmount ?? 0) / bill.allocations.length)} / tenant
          </p>
          <div className="mt-2 space-y-1.5">
            {bill.allocations.map((a, i) => (
              <div key={i} className="flex justify-between rounded-xl border border-[#E4E0D6] bg-white px-3 py-2 text-sm">
                <span className="text-[#2A2724]">
                  {a.unitName} — {a.tenantName}
                </span>
                <span className="text-[#8A8478]">{currency(a.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

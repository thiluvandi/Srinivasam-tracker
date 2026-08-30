import Link from "next/link";
import { getHomeDashboardData } from "@/lib/data/dashboard";
import { currency } from "@/lib/currency";
import { MONTH_NAMES, STATUS_LABEL } from "@/lib/status";
import { STATUS_COLORS } from "@/lib/statusColors";

export const dynamic = "force-dynamic";

function monthHref(year: number, month: number) {
  return `/?year=${year}&month=${month}`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;

  const data = await getHomeDashboardData(year, month);

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const collectionRate =
    data.collected + data.outstanding > 0
      ? Math.round((data.collected / (data.collected + data.outstanding)) * 100)
      : 100;

  return (
    <div className="px-5 pb-8 pt-8">
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-9 rounded-full" />
        <p className="text-xl font-semibold tracking-tight text-[#2A2724]">Srinivasam</p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <Link href={monthHref(prevMonth.year, prevMonth.month)} className="px-2 text-lg text-[#A39D8E]">
          ‹
        </Link>
        <p className="text-base font-medium text-[#2A2724]">
          {MONTH_NAMES[month - 1]} {year}
        </p>
        <Link href={monthHref(nextMonth.year, nextMonth.month)} className="px-2 text-lg text-[#A39D8E]">
          ›
        </Link>
      </div>

      {data.attention.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {data.attention.map((item) =>
            item.href ? (
              <Link
                key={item.message}
                href={item.href}
                className="block rounded-lg bg-[#FAF1DD] px-3 py-2 text-center text-sm font-medium text-[#8A6B27] underline"
              >
                {item.message}
              </Link>
            ) : (
              <p
                key={item.message}
                className="rounded-lg bg-[#FAF1DD] px-3 py-2 text-center text-sm text-[#8A6B27]"
              >
                {item.message}
              </p>
            )
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-4xl font-semibold tracking-tight text-[#2A2724]">{currency(data.collected)}</p>
        <p className="mt-1 text-sm text-[#8A8478]">Collected</p>
        <p className="mt-2 text-sm text-[#8A8478]">{currency(data.outstanding)} outstanding</p>

        <div className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#E4E0D6]">
          <div className="h-full rounded-full bg-[#7C9473]" style={{ width: `${collectionRate}%` }} />
        </div>
        <p className="mt-2 text-sm text-[#8A8478]">
          {data.settledCount} of {data.occupiedCount} settled
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {data.units
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((unit) => (
            <div key={unit.unitId} className="rounded-2xl border border-[#E4E0D6] bg-white p-4">
              {unit.vacant || !unit.ledgerId ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#2A2724]">{unit.unitName}</p>
                    <p className="text-sm text-[#A39D8E]">Vacant</p>
                  </div>
                  <p className="text-sm text-[#A39D8E]">No rent expected</p>
                </div>
              ) : (
                <Link href={`/ledger/${unit.ledgerId}`} className="block">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#2A2724]">{unit.unitName}</p>
                      <p className="text-sm text-[#8A8478]">{unit.tenantName}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[unit.status!].bg} ${STATUS_COLORS[unit.status!].text}`}
                    >
                      {STATUS_LABEL[unit.status!]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      {unit.status === "partial" ? (
                        <>
                          <p className="text-lg font-semibold text-[#2A2724]">
                            {currency(unit.paidTotal ?? 0)} / {currency(unit.totalDue ?? 0)}
                          </p>
                          {unit.isOverdueBalance && (
                            <p className="text-xs text-[#9C563A]">{currency(unit.balance ?? 0)} overdue</p>
                          )}
                        </>
                      ) : (
                        <p className="text-lg font-semibold text-[#2A2724]">{currency(unit.totalDue ?? 0)}</p>
                      )}
                      {unit.status === "paid" && unit.lastPaymentDate && (
                        <p className="text-xs text-[#8A8478]">
                          Paid {new Date(unit.lastPaymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-[#8A8478]">
                      {unit.status === "paid" ? "View" : "Add payment"}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { getMonthlySummary, getFinancialYearSummary } from "@/lib/data/reports";
import { currency } from "@/lib/currency";
import { MONTH_NAMES } from "@/lib/status";
import { MonthYearPicker } from "@/components/MonthYearPicker";

export const dynamic = "force-dynamic";

function monthHref(year: number, month: number) {
  return `/reports?year=${year}&month=${month}`;
}

function currentFyStartYear(date: Date) {
  return date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; fy?: string }>;
}) {
  const { year: yearParam, month: monthParam, fy: fyParam } = await searchParams;
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  const fyStartYear = fyParam ? Number(fyParam) : currentFyStartYear(now);

  const [summary, fySummary] = await Promise.all([
    getMonthlySummary(year, month),
    getFinancialYearSummary(fyStartYear),
  ]);

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const exportLinks = [
    { href: `/api/exports/monthly-collection?year=${year}&month=${month}`, label: "Monthly Collection Report" },
    { href: `/api/exports/tenant-ledger`, label: "Tenant Ledger" },
    { href: `/api/exports/fy-summary?fy=${fyStartYear}`, label: "Financial Year Rent Summary" },
    { href: `/api/exports/outstanding?year=${year}&month=${month}`, label: "Outstanding Rent Report" },
    { href: `/api/exports/water-allocation?year=${year}&month=${month}`, label: "Water Bill Allocation Report" },
  ];

  return (
    <div className="px-5 pb-8 pt-8">
      <p className="text-xl font-semibold tracking-tight text-[#2A2724]">Reports</p>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center">
        <span />
        <div className="flex items-center justify-center gap-4">
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
        <div className="flex justify-end pl-2">
          <MonthYearPicker year={year} month={month} basePath="/reports" extraQuery={{ fy: String(fyStartYear) }} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#E4E0D6] bg-white p-4 text-center">
        <p className="text-3xl font-semibold text-[#2A2724]">{currency(summary.expected + summary.water + summary.adjustments)}</p>
        <p className="text-sm text-[#8A8478]">Expected</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-lg font-semibold text-[#5C7A52]">{currency(summary.collected)}</p>
            <p className="text-[#8A8478]">Collected</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-[#9C563A]">{currency(summary.outstanding)}</p>
            <p className="text-[#8A8478]">Outstanding</p>
          </div>
        </div>
        <p className="mt-3 text-2xl font-semibold text-[#2A2724]">{summary.collectionRate}%</p>
        <p className="text-sm text-[#8A8478]">Collection</p>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
        <div className="rounded-xl bg-[#EAF0E4] py-2 text-[#5C7A52]">Paid {summary.counts.paid}</div>
        <div className="rounded-xl bg-[#F5EAD3] py-2 text-[#8A6B27]">Partial {summary.counts.partial}</div>
        <div className="rounded-xl bg-[#F5E3DB] py-2 text-[#9C563A]">Overdue {summary.counts.overdue}</div>
        <div className="rounded-xl bg-[#E7EDF2] py-2 text-[#5E7284]">Pending {summary.counts.pending}</div>
        <div className="rounded-xl bg-[#EDE8F2] py-2 text-[#6E6089]">Vacant {summary.counts.vacant}</div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#2A2724]">Financial Year {fyStartYear}–{String(fyStartYear + 1).slice(2)}</p>
          <div className="flex gap-2 text-sm">
            <Link href={`/reports?fy=${fyStartYear - 1}&year=${year}&month=${month}`} className="text-[#A39D8E]">‹</Link>
            <Link href={`/reports?fy=${fyStartYear + 1}&year=${year}&month=${month}`} className="text-[#A39D8E]">›</Link>
          </div>
        </div>
        <div className="mt-2 space-y-1.5 rounded-2xl border border-[#E4E0D6] bg-white p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Total rent income</span>
            <span className="text-[#2A2724]">{currency(fySummary.totalRent)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Water charges</span>
            <span className="text-[#2A2724]">{currency(fySummary.totalWater)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Collected</span>
            <span className="text-[#2A2724]">{currency(fySummary.totalCollected)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Outstanding</span>
            <span className="text-[#2A2724]">{currency(fySummary.totalOutstanding)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-medium text-[#2A2724]">Export</p>
        <div className="mt-2 space-y-2">
          {exportLinks.map((l) => (
            <a key={l.href} href={l.href} className="block rounded-xl border border-[#E4E0D6] bg-white px-4 py-3 text-sm text-[#2A2724]">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

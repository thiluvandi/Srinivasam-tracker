"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MONTH_NAMES } from "@/lib/status";

const YEAR_RANGE_BACK = 5;
const YEAR_RANGE_FORWARD = 1;

export function MonthYearPicker({
  year,
  month,
  basePath = "/",
  extraQuery = {},
}: {
  year: number;
  month: number;
  basePath?: string;
  /** Extra query params to preserve alongside year/month, e.g. { fy: "2026" }. */
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingMonth, setPendingMonth] = useState(month);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function openPicker() {
    setPendingYear(year);
    setPendingMonth(month);
    setOpen(true);
  }

  function go() {
    setOpen(false);
    const params = new URLSearchParams({ ...extraQuery, year: String(pendingYear), month: String(pendingMonth) });
    router.push(`${basePath}?${params.toString()}`);
  }

  const now = new Date();
  const years = Array.from(
    { length: YEAR_RANGE_BACK + YEAR_RANGE_FORWARD + 1 },
    (_, i) => now.getFullYear() - YEAR_RANGE_BACK + i
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={openPicker}
        aria-label="Jump to month"
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#A39D8E] hover:text-[#2A2724]"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 9.5H20.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 3V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 3V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-56 rounded-2xl border border-[#E4E0D6] bg-white p-4 shadow-lg">
          <label className="block text-xs font-medium text-[#8A8478]">Month</label>
          <select
            value={pendingMonth}
            onChange={(e) => setPendingMonth(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2 text-sm text-[#2A2724]"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-xs font-medium text-[#8A8478]">Year</label>
          <select
            value={pendingYear}
            onChange={(e) => setPendingYear(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2 text-sm text-[#2A2724]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={go}
            className="mt-4 w-full rounded-xl bg-[#2A2724] px-3 py-2 text-sm font-medium text-white"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}

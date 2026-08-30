import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { logOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const supabase = createAdminClient();
  const now = new Date();

  const [{ count: reviewCount }, { count: unmatchedCount }] = await Promise.all([
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending_review").not("monthly_ledger_id", "is", null),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "unmatched"),
  ]);

  const items = [
    { href: `/water-bill?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, label: "Water Bill", hint: "Add or edit this month's bill" },
    { href: "/more/needs-review", label: "Needs Review", hint: reviewCount ? `${reviewCount} payment${reviewCount === 1 ? "" : "s"}` : "All caught up" },
    { href: "/more/unmatched", label: "Unmatched Payments", hint: unmatchedCount ? `${unmatchedCount} payment${unmatchedCount === 1 ? "" : "s"}` : "None" },
    { href: "/more/pin", label: "Change PIN", hint: "" },
  ];

  return (
    <div className="px-5 pb-8 pt-8">
      <p className="text-xl font-semibold tracking-tight text-[#2A2724]">More</p>

      <div className="mt-6 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-2xl border border-[#E4E0D6] bg-white px-4 py-3.5"
          >
            <span className="text-sm text-[#2A2724]">{item.label}</span>
            <span className="text-xs text-[#A39D8E]">{item.hint}</span>
          </Link>
        ))}
      </div>

      <form action={logOut} className="mt-6">
        <button type="submit" className="w-full rounded-xl border border-[#E4E0D6] bg-white px-4 py-3 text-sm font-medium text-[#B4694A]">
          Log out
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { currency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function NeedsReviewPage() {
  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("payments")
    .select("id, amount, source, monthly_ledgers(units(name), tenancies(tenants(name)))")
    .eq("status", "pending_review")
    .not("monthly_ledger_id", "is", null)
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    amount: number;
    source: string;
    monthly_ledgers: { units: { name: string } | { name: string }[]; tenancies: { tenants: { name: string } | { name: string }[] } | { tenants: { name: string } | { name: string }[] }[] } | null;
  };

  return (
    <div className="px-5 pb-8 pt-8">
      <Link href="/more" className="text-sm text-[#8A8478]">
        ‹ More
      </Link>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#2A2724]">Needs Review</p>

      <div className="mt-6 space-y-2">
        {((rows ?? []) as unknown as Row[]).map((r) => {
          const ledger = r.monthly_ledgers;
          const unit = ledger ? (Array.isArray(ledger.units) ? ledger.units[0] : ledger.units) : null;
          const tenancy = ledger ? (Array.isArray(ledger.tenancies) ? ledger.tenancies[0] : ledger.tenancies) : null;
          const tenant = tenancy ? (Array.isArray(tenancy.tenants) ? tenancy.tenants[0] : tenancy.tenants) : null;
          return (
            <Link key={r.id} href={`/payments/${r.id}`} className="flex items-center justify-between rounded-2xl border border-[#E4E0D6] bg-white px-4 py-3.5 text-sm">
              <div>
                <p className="text-[#2A2724]">
                  {unit?.name} — {tenant?.name}
                </p>
                <p className="text-xs text-[#A39D8E]">{r.source === "whatsapp" ? "WhatsApp" : "Manual upload"}</p>
              </div>
              <span className="text-[#2A2724]">{currency(Number(r.amount))}</span>
            </Link>
          );
        })}
        {(!rows || rows.length === 0) && <p className="text-sm text-[#A39D8E]">Nothing needs review right now.</p>}
      </div>
    </div>
  );
}

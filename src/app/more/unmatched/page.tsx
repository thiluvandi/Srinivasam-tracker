import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { currency } from "@/lib/currency";
import { assignUnmatchedPayment } from "./actions";

export const dynamic = "force-dynamic";

export default async function UnmatchedPaymentsPage() {
  const supabase = createAdminClient();
  const now = new Date();

  const { data: rows } = await supabase
    .from("payments")
    .select("id, amount, sender_phone, created_at")
    .eq("status", "unmatched")
    .order("created_at", { ascending: false });

  const { data: tenancies } = await supabase
    .from("tenancies")
    .select("id, units(name), tenants(name)")
    .eq("status", "active");

  type TenancyRow = { id: string; units: { name: string } | { name: string }[]; tenants: { name: string } | { name: string }[] };

  return (
    <div className="px-5 pb-8 pt-8">
      <Link href="/more" className="text-sm text-[#8A8478]">
        ‹ More
      </Link>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#2A2724]">Unmatched Payments</p>
      <p className="mt-1 text-sm text-[#8A8478]">
        Payments received via WhatsApp whose sender phone number didn&apos;t match an active tenant.
      </p>

      <div className="mt-6 space-y-3">
        {(rows ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-[#E4E0D6] bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#2A2724]">{r.sender_phone}</span>
              <span className="text-[#2A2724]">{currency(Number(r.amount))}</span>
            </div>
            <form action={assignUnmatchedPayment} className="mt-3 flex items-center gap-2">
              <input type="hidden" name="paymentId" value={r.id} />
              <input type="hidden" name="year" value={now.getFullYear()} />
              <input type="hidden" name="month" value={now.getMonth() + 1} />
              <select name="tenancyId" required className="flex-1 rounded-xl border border-[#E4E0D6] px-2 py-2 text-sm">
                <option value="">Assign to…</option>
                {((tenancies ?? []) as TenancyRow[]).map((t) => {
                  const unit = Array.isArray(t.units) ? t.units[0] : t.units;
                  const tenant = Array.isArray(t.tenants) ? t.tenants[0] : t.tenants;
                  return (
                    <option key={t.id} value={t.id}>
                      {unit?.name} — {tenant?.name}
                    </option>
                  );
                })}
              </select>
              <button type="submit" className="rounded-xl bg-[#2A2724] px-3 py-2 text-xs font-medium text-white">
                Assign
              </button>
            </form>
          </div>
        ))}
        {(!rows || rows.length === 0) && (
          <p className="text-sm text-[#A39D8E]">
            None yet — this list stays empty until WhatsApp payment ingestion is connected.
          </p>
        )}
      </div>
    </div>
  );
}

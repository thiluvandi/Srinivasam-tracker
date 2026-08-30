import Link from "next/link";
import { notFound } from "next/navigation";
import { getLedgerDetail } from "@/lib/data/ledger";
import { currency } from "@/lib/currency";
import { MONTH_NAMES, STATUS_LABEL } from "@/lib/status";
import { STATUS_COLORS } from "@/lib/statusColors";
import { addAdjustment, deletePaymentAction } from "../actions";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm text-[#2A2724] focus:border-[#B9C4B0] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#8A8478]";

export default async function LedgerDetailPage({
  params,
}: {
  params: Promise<{ ledgerId: string }>;
}) {
  const { ledgerId } = await params;
  const ledger = await getLedgerDetail(ledgerId);
  if (!ledger) notFound();

  return (
    <div className="px-5 pb-8 pt-8">
      <Link href="/" className="text-sm text-[#8A8478]">
        ‹ Home
      </Link>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#2A2724]">{ledger.unitName}</p>
      <p className="text-sm text-[#8A8478]">
        <Link href={`/tenants/${ledger.tenantId}`} className="underline">
          {ledger.tenantName}
        </Link>{" "}
        · {MONTH_NAMES[ledger.month - 1]} {ledger.year}
      </p>

      <div className="mt-6 rounded-2xl border border-[#E4E0D6] bg-white p-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Rent</span>
            <span className="text-[#2A2724]">{currency(ledger.baseRent)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Water</span>
            <span className="text-[#2A2724]">{currency(ledger.waterCharge)}</span>
          </div>
          {ledger.adjustmentsTotal !== 0 && (
            <div className="flex justify-between">
              <span className="text-[#8A8478]">Adjustments</span>
              <span className="text-[#2A2724]">
                {ledger.adjustmentsTotal > 0 ? "+" : "-"}
                {currency(Math.abs(ledger.adjustmentsTotal))}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#E4E0D6] pt-1.5 font-medium">
            <span className="text-[#2A2724]">Total Due</span>
            <span className="text-[#2A2724]">{currency(ledger.totalDue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Paid</span>
            <span className="text-[#2A2724]">{currency(ledger.paidTotal)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-[#2A2724]">Balance</span>
            <span className="text-[#2A2724]">{currency(Math.max(ledger.balance, 0))}</span>
          </div>
        </div>

        <div className="mt-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[ledger.status].bg} ${STATUS_COLORS[ledger.status].text}`}
          >
            {STATUS_LABEL[ledger.status]}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-[#2A2724]">Payments</p>
        <div className="mt-2 space-y-2">
          {ledger.payments.map((p) => (
            <div key={p.id} className="rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#2A2724]">
                  {p.transactionDate ? new Date(p.transactionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                </span>
                <span className="text-[#2A2724]">{currency(p.amount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-[#8A8478]">
                <span>{p.paymentMethod ?? p.source}</span>
                {p.status === "confirmed" && <span className="text-[#5C7A52]">✓ Verified</span>}
                {p.status === "pending_review" && (
                  <Link href={`/payments/${p.id}`} className="text-[#7C93A8] underline">
                    Needs review
                  </Link>
                )}
                {p.status === "rejected" && <span className="text-[#B4694A]">Rejected</span>}
              </div>
              {p.status === "confirmed" && (
                <div className="mt-2 flex gap-3 text-xs">
                  <Link href={`/payments/${p.id}`} className="text-[#7C93A8] underline">
                    Details
                  </Link>
                  <form action={deletePaymentAction}>
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input type="hidden" name="ledgerId" value={ledger.id} />
                    <button type="submit" className="text-[#B4694A] underline">
                      Delete
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
          {ledger.payments.length === 0 && <p className="text-sm text-[#A39D8E]">No payment uploaded yet.</p>}
        </div>

        <Link
          href={`/ledger/${ledger.id}/upload`}
          className="mt-3 block w-full rounded-xl bg-[#2A2724] px-4 py-3 text-center text-sm font-medium text-white"
        >
          + Add Payment
        </Link>
      </div>

      <div className="mt-6">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-[#2A2724]">Add Adjustment</summary>
          <form action={addAdjustment} className="mt-3 space-y-3 rounded-xl border border-[#E4E0D6] bg-white p-4">
            <input type="hidden" name="ledgerId" value={ledger.id} />
            <div>
              <label className={labelClass}>Type</label>
              <select name="type" defaultValue="charge" className={inputClass}>
                <option value="charge">Charge</option>
                <option value="credit">Credit</option>
                <option value="waiver">Waiver</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Amount</label>
              <input type="number" step="0.01" name="amount" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reason</label>
              <input type="text" name="reason" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Notes (optional)</label>
              <textarea name="notes" rows={2} className={inputClass} />
            </div>
            <button type="submit" className="w-full rounded-xl bg-[#2A2724] px-4 py-2.5 text-sm font-medium text-white">
              Save Adjustment
            </button>
          </form>
        </details>

        {ledger.adjustments.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {ledger.adjustments.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#E4E0D6] bg-white px-3 py-2 text-xs text-[#8A8478]">
                <span className="text-[#2A2724]">{a.reason}</span> — {a.amount > 0 ? "+" : "-"}
                {currency(Math.abs(a.amount))} ({a.type})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

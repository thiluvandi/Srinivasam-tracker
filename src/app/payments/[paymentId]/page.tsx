import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentDetail } from "@/lib/data/payment";
import { currency } from "@/lib/currency";
import { confirmPendingPayment, rejectPendingPayment, editPayment } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm text-[#2A2724] focus:border-[#B9C4B0] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#8A8478]";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  const payment = await getPaymentDetail(paymentId);
  if (!payment) notFound();

  return (
    <div className="px-5 pb-8 pt-8">
      {payment.ledgerId && (
        <Link href={`/ledger/${payment.ledgerId}`} className="text-sm text-[#8A8478]">
          ‹ {payment.unitName}
        </Link>
      )}
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#2A2724]">Payment</p>
      <p className="text-sm text-[#8A8478]">{payment.tenantName}</p>

      {payment.screenshotUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={payment.screenshotUrl} alt="" className="mt-4 max-h-64 rounded-xl border border-[#E4E0D6]" />
      )}

      {payment.status === "pending_review" && payment.ledgerId ? (
        <>
          <p className="mt-4 text-sm font-medium text-[#8A6B27]">Verify Payment</p>
          {payment.ocr && payment.ocr.confidence !== null && payment.ocr.confidence < 0.5 && (
            <p className="mt-2 rounded-lg bg-[#F5E3DB] px-3 py-2 text-sm text-[#9C563A]">
              Couldn&apos;t confidently read this screenshot — check the fields below.
            </p>
          )}
          <form action={confirmPendingPayment} className="mt-3 space-y-3">
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="ledgerId" value={payment.ledgerId} />
            <input type="hidden" name="tenantId" value={payment.tenantId ?? ""} />
            <div>
              <label className={labelClass}>Amount</label>
              <input type="number" step="0.01" name="amount" defaultValue={payment.ocr?.amount ?? payment.amount} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" name="transactionDate" defaultValue={payment.ocr?.transactionDate ?? payment.transactionDate ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reference</label>
              <input type="text" name="referenceNumber" defaultValue={payment.referenceNumber ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payer</label>
              <input type="text" name="payerName" defaultValue={payment.ocr?.payerName ?? payment.payerName ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payment method</label>
              <input type="text" name="paymentMethod" defaultValue={payment.ocr?.paymentMethod ?? payment.paymentMethod ?? ""} className={inputClass} />
            </div>
            <button type="submit" className="w-full rounded-xl bg-[#2A2724] px-4 py-3 text-sm font-medium text-white">
              Confirm Payment
            </button>
          </form>
          <form action={rejectPendingPayment} className="mt-2">
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="ledgerId" value={payment.ledgerId} />
            <button type="submit" className="w-full text-sm text-[#B4694A]">
              Reject
            </button>
          </form>
        </>
      ) : (
        <div className="mt-4 space-y-1.5 rounded-2xl border border-[#E4E0D6] bg-white p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Amount</span>
            <span className="text-[#2A2724]">{currency(payment.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Date</span>
            <span className="text-[#2A2724]">{payment.transactionDate ? new Date(payment.transactionDate).toLocaleDateString("en-IN") : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Reference</span>
            <span className="text-[#2A2724]">{payment.referenceNumber ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Payer</span>
            <span className="text-[#2A2724]">{payment.payerName ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Method</span>
            <span className="text-[#2A2724]">{payment.paymentMethod ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Status</span>
            <span className="text-[#2A2724] capitalize">{payment.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8478]">Created</span>
            <span className="text-[#2A2724]">{new Date(payment.createdAt).toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}

      {payment.status === "confirmed" && payment.ledgerId && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-[#7C93A8]">Edit payment</summary>
          <form action={editPayment} className="mt-3 space-y-3 rounded-xl border border-[#E4E0D6] bg-white p-4">
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="ledgerId" value={payment.ledgerId} />
            <div>
              <label className={labelClass}>Amount</label>
              <input type="number" step="0.01" name="amount" defaultValue={payment.amount} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" name="transactionDate" defaultValue={payment.transactionDate ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reference</label>
              <input type="text" name="referenceNumber" defaultValue={payment.referenceNumber ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payer</label>
              <input type="text" name="payerName" defaultValue={payment.payerName ?? ""} className={inputClass} />
            </div>
            <button type="submit" className="w-full rounded-xl bg-[#2A2724] px-4 py-2.5 text-sm font-medium text-white">
              Save changes
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

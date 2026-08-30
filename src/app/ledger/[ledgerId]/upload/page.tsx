import Link from "next/link";
import { notFound } from "next/navigation";
import { getLedgerDetail } from "@/lib/data/ledger";
import { currency } from "@/lib/currency";
import { MONTH_NAMES } from "@/lib/status";
import { UploadFlow } from "./UploadFlow";

export const dynamic = "force-dynamic";

export default async function UploadPaymentPage({
  params,
}: {
  params: Promise<{ ledgerId: string }>;
}) {
  const { ledgerId } = await params;
  const ledger = await getLedgerDetail(ledgerId);
  if (!ledger) notFound();

  return (
    <div className="px-5 pb-8 pt-8">
      <Link href={`/ledger/${ledger.id}`} className="text-sm text-[#8A8478]">
        ‹ {ledger.unitName}
      </Link>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#2A2724]">
        {MONTH_NAMES[ledger.month - 1]} {ledger.year}
      </p>
      <p className="mt-1 text-sm text-[#8A8478]">
        Amount Due {currency(ledger.totalDue)} · Balance {currency(Math.max(ledger.balance, 0))}
      </p>

      <UploadFlow ledgerId={ledger.id} tenantId={ledger.tenantId} balance={Math.max(ledger.balance, 0)} />
    </div>
  );
}

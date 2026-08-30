import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantProfileData } from "@/lib/data/tenantProfile";
import { createAdminClient } from "@/lib/supabase/admin";
import { currency } from "@/lib/currency";
import { MONTH_NAMES, STATUS_LABEL } from "@/lib/status";
import { STATUS_COLORS } from "@/lib/statusColors";
import { ConfirmButton } from "@/components/ConfirmButton";
import { endTenancy, uploadTenantDocument, deleteTenantDocument, deleteTenant } from "../actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  rental_agreement: "Rental Agreement",
  id_proof: "Aadhaar / PAN",
  deposit_receipt: "Deposit Receipt",
  other: "Other",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm text-[#2A2724] focus:border-[#B9C4B0] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#8A8478]";

export default async function TenantProfilePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const data = await getTenantProfileData(tenantId);
  if (!data) notFound();

  const { tenant, tenancies, previousTenants, documents, ledgerHistory } = data;
  const activeTenancy = tenancies.find((t) => t.status === "active");

  const supabase = createAdminClient();
  const documentsWithUrls = await Promise.all(
    documents.map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from("tenant-documents")
        .createSignedUrl(doc.storagePath, 600);
      return { ...doc, signedUrl: signed?.signedUrl ?? null };
    })
  );

  return (
    <div className="px-5 pb-8 pt-8">
      <Link href="/tenants" className="text-sm text-[#8A8478]">
        ‹ Tenants
      </Link>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#2A2724]">{tenant.name}</p>
      <p className="mt-1 text-sm text-[#8A8478]">{tenant.phone}</p>

      {activeTenancy && (
        <div className="mt-6 rounded-2xl border border-[#E4E0D6] bg-white p-4">
          <p className="text-sm font-medium text-[#2A2724]">{activeTenancy.unitName}</p>
          <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            <p className="text-[#8A8478]">Monthly rent</p>
            <p className="text-right text-[#2A2724]">{currency(activeTenancy.monthlyRent)}</p>
            <p className="text-[#8A8478]">Deposit</p>
            <p className="text-right text-[#2A2724]">{currency(activeTenancy.securityDeposit)}</p>
            <p className="text-[#8A8478]">Lease start</p>
            <p className="text-right text-[#2A2724]">
              {new Date(activeTenancy.leaseStartDate).toLocaleDateString("en-IN")}
            </p>
            {activeTenancy.leaseEndDate && (
              <>
                <p className="text-[#8A8478]">Lease end</p>
                <p className="text-right text-[#2A2724]">
                  {new Date(activeTenancy.leaseEndDate).toLocaleDateString("en-IN")}
                </p>
              </>
            )}
            <p className="text-[#8A8478]">Rent due day</p>
            <p className="text-right text-[#2A2724]">{activeTenancy.rentDueDay}th</p>
          </div>

          <details className="mt-4 border-t border-[#E4E0D6] pt-3">
            <summary className="cursor-pointer text-sm font-medium text-[#B4694A]">End Tenancy</summary>
            <form action={endTenancy} className="mt-3 space-y-3">
              <input type="hidden" name="tenancyId" value={activeTenancy.id} />
              <input type="hidden" name="tenantId" value={tenant.id} />
              <div>
                <label className={labelClass}>Move-out date</label>
                <input type="date" name="moveOutDate" defaultValue={today()} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Deposit returned</label>
                <input type="number" step="0.01" name="depositReturned" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Deductions</label>
                <input type="number" step="0.01" name="depositDeductions" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Final notes</label>
                <textarea name="finalNotes" rows={2} className={inputClass} />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl border border-[#F0D3C4] bg-[#F5E3DB] px-4 py-2.5 text-sm font-medium text-[#9C563A]"
              >
                Confirm move-out
              </button>
            </form>
          </details>
        </div>
      )}

      {!activeTenancy && tenancies.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#E4E0D6] bg-white p-4">
          <p className="text-sm font-medium text-[#2A2724]">{tenancies[0].unitName}</p>
          <p className="mt-1 text-sm text-[#A39D8E]">
            Moved out {tenancies[0].moveOutDate && new Date(tenancies[0].moveOutDate).toLocaleDateString("en-IN")}
          </p>
        </div>
      )}

      {previousTenants.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-[#2A2724]">Previous Tenants</p>
          <div className="mt-2 space-y-2">
            {previousTenants.map((p, i) => (
              <Link
                key={i}
                href={`/tenants/${p.tenantId}`}
                className="block rounded-xl border border-[#E4E0D6] bg-white px-3 py-2 text-sm"
              >
                <span className="text-[#2A2724]">{p.tenantName}</span>
                <span className="ml-2 text-[#A39D8E]">
                  {p.moveOutDate ? `until ${new Date(p.moveOutDate).toLocaleDateString("en-IN")}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium text-[#2A2724]">Payment History</p>
        {ledgerHistory.length === 0 ? (
          <p className="mt-2 text-sm text-[#A39D8E]">No history yet.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {ledgerHistory.map((row) => (
              <Link
                key={row.ledgerId}
                href={`/ledger/${row.ledgerId}`}
                className="flex items-center justify-between rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm"
              >
                <span className="text-[#2A2724]">
                  {MONTH_NAMES[row.month - 1].slice(0, 3)} {row.year}
                </span>
                <span className="text-[#8A8478]">
                  {currency(row.paidTotal)} / {currency(row.totalDue)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status].bg} ${STATUS_COLORS[row.status].text}`}>
                  {STATUS_LABEL[row.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-[#2A2724]">Documents</p>
        <div className="mt-2 space-y-2">
          {documentsWithUrls.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm">
              <div>
                {doc.signedUrl ? (
                  <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer" className="text-[#2A2724] underline">
                    {doc.fileName}
                  </a>
                ) : (
                  <span className="text-[#2A2724]">{doc.fileName}</span>
                )}
                <p className="text-xs text-[#A39D8E]">{CATEGORY_LABEL[doc.category] ?? doc.category}</p>
              </div>
              <form action={deleteTenantDocument}>
                <input type="hidden" name="documentId" value={doc.id} />
                <input type="hidden" name="tenantId" value={tenant.id} />
                <button type="submit" className="text-xs text-[#B4694A]">
                  Delete
                </button>
              </form>
            </div>
          ))}
          {documentsWithUrls.length === 0 && <p className="text-sm text-[#A39D8E]">No documents uploaded.</p>}
        </div>

        <form action={uploadTenantDocument} className="mt-3 space-y-2 rounded-xl border border-dashed border-[#E4E0D6] p-3">
          <input type="hidden" name="tenantId" value={tenant.id} />
          {activeTenancy && <input type="hidden" name="tenancyId" value={activeTenancy.id} />}
          <select name="category" defaultValue="other" className={inputClass}>
            <option value="rental_agreement">Rental Agreement</option>
            <option value="id_proof">Aadhaar / PAN</option>
            <option value="deposit_receipt">Deposit Receipt</option>
            <option value="other">Other</option>
          </select>
          <input type="text" name="description" placeholder="Optional description" className={inputClass} />
          <input
            type="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="w-full text-xs text-[#8A8478]"
          />
          <button type="submit" className="w-full rounded-xl bg-[#2A2724] px-4 py-2 text-sm font-medium text-white">
            Upload
          </button>
        </form>
      </div>

      <div className="mt-8 border-t border-[#E4E0D6] pt-4">
        <form action={deleteTenant}>
          <input type="hidden" name="tenantId" value={tenant.id} />
          <ConfirmButton
            confirmMessage={`Permanently delete ${tenant.name} and their tenancy/documents? This can't be undone. Use this only to fix a mistake — for a real move-out, use End Tenancy instead.`}
            className="text-xs font-medium text-[#B4694A]"
          >
            Delete tenant permanently
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}

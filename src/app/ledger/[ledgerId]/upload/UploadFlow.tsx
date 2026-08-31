"use client";

import { useState } from "react";
import { uploadAndExtract, createManualEntry, confirmUploadedPayment, cancelUpload, type UploadResult } from "./uploadActions";

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E4E0D6] bg-white px-3 py-2.5 text-sm text-[#2A2724] focus:border-[#B9C4B0] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#8A8478]";

export function UploadFlow({
  ledgerId,
  tenantId,
  balance,
}: {
  ledgerId: string;
  tenantId: string;
  balance: number;
}) {
  const [stage, setStage] = useState<"upload" | "reading" | "verify">("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    setStage("reading");
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    try {
      const r = await uploadAndExtract(ledgerId, formData);
      setResult(r);
      setStage("verify");
    } catch {
      setError("Something went wrong uploading this screenshot. Try again.");
      setStage("upload");
    }
  }

  async function handleManualEntry() {
    setError(null);
    try {
      const r = await createManualEntry(ledgerId);
      setResult(r);
      setManualEntry(true);
      setStage("verify");
    } catch {
      setError("Something went wrong starting a manual entry. Try again.");
    }
  }

  if (stage === "upload") {
    return (
      <div className="mt-6">
        <label className="block rounded-2xl border-2 border-dashed border-[#E4E0D6] bg-white p-8 text-center">
          <span className="text-sm font-medium text-[#2A2724]">Upload Payment Screenshot</span>
          <p className="mt-1 text-xs text-[#A39D8E]">From your gallery or camera</p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChange(file);
            }}
          />
        </label>

        <button
          type="button"
          onClick={handleManualEntry}
          className="mt-3 w-full rounded-xl border border-[#E4E0D6] bg-white px-4 py-3 text-sm font-medium text-[#2A2724]"
        >
          Enter payment details myself
        </button>

        {error && <p className="mt-3 text-center text-sm text-[#B4694A]">{error}</p>}
      </div>
    );
  }

  if (stage === "reading") {
    return (
      <div className="mt-6 text-center">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="mx-auto max-h-64 rounded-xl border border-[#E4E0D6]" />
        )}
        <p className="mt-4 text-sm text-[#8A8478]">Reading payment…</p>
      </div>
    );
  }

  // stage === "verify"
  const lowConfidence = !manualEntry && (!result || result.confidence < 0.5 || result.amount === null);

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-[#8A6B27]">Verify Payment</p>
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="mt-3 max-h-56 rounded-xl border border-[#E4E0D6]" />
      )}

      {lowConfidence && (
        <p className="mt-3 rounded-lg bg-[#F5E3DB] px-3 py-2 text-sm text-[#9C563A]">
          Couldn&apos;t confidently read this screenshot — check the fields below, or enter it manually.
        </p>
      )}

      <form
        action={confirmUploadedPayment}
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          const amountInput = (e.currentTarget.elements.namedItem("amount") as HTMLInputElement)?.value;
          const amount = Number(amountInput);
          if (amount > balance && balance > 0) {
            if (!confirm(`This payment (₹${amount.toLocaleString("en-IN")}) exceeds the outstanding balance of ₹${balance.toLocaleString("en-IN")}. Continue?`)) {
              e.preventDefault();
            }
          }
        }}
      >
        <input type="hidden" name="paymentId" value={result?.paymentId} />
        <input type="hidden" name="ledgerId" value={ledgerId} />
        <input type="hidden" name="tenantId" value={tenantId} />

        <div>
          <label className={labelClass}>Amount</label>
          <input type="number" step="0.01" name="amount" defaultValue={result?.amount ?? ""} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" name="transactionDate" defaultValue={result?.transactionDate ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Reference</label>
          <input type="text" name="referenceNumber" defaultValue={result?.referenceNumber ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Payer</label>
          <input type="text" name="payerName" defaultValue={result?.payerName ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Payment method</label>
          <input type="text" name="paymentMethod" defaultValue={result?.paymentMethod ?? ""} className={inputClass} />
        </div>
        <input type="hidden" name="paymentApp" value={result?.paymentApp ?? ""} />

        <button type="submit" className="w-full rounded-xl bg-[#2A2724] px-4 py-3 text-sm font-medium text-white">
          Confirm Payment
        </button>
      </form>

      <div className="mt-3 flex justify-between text-sm">
        <button
          type="button"
          onClick={() => result && cancelUpload(result.paymentId, ledgerId)}
          className="text-[#A39D8E]"
        >
          Cancel
        </button>
        {!manualEntry && (
          <button type="button" onClick={() => setManualEntry(true)} className="text-[#7C93A8] underline">
            Couldn&apos;t read screenshot — enter manually
          </button>
        )}
      </div>
    </div>
  );
}

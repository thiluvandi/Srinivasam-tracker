"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractPaymentDetails } from "@/lib/ocr/extractPayment";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export type UploadResult = {
  paymentId: string;
  amount: number | null;
  transactionDate: string | null;
  transactionTime: string | null;
  referenceNumber: string | null;
  payerName: string | null;
  paymentApp: string | null;
  paymentMethod: string | null;
  notes: string | null;
  confidence: number;
};

export async function uploadAndExtract(ledgerId: string, formData: FormData): Promise<UploadResult> {
  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("A screenshot is required");
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Unsupported file type");
  }

  const supabase = createAdminClient();

  const { data: ledger, error: ledgerError } = await supabase
    .from("monthly_ledgers")
    .select("id, tenancy_id, tenancies(tenant_id)")
    .eq("id", ledgerId)
    .single();
  if (ledgerError) throw ledgerError;
  const tenancy = Array.isArray(ledger.tenancies) ? ledger.tenancies[0] : ledger.tenancies;

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = file.type.split("/")[1];
  const path = `${ledgerId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-screenshots")
    .upload(path, bytes, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({
      monthly_ledger_id: ledgerId,
      tenant_id: tenancy?.tenant_id,
      amount: 0,
      source: "manual_upload",
      status: "pending_review",
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  await supabase.from("payment_media").insert({
    payment_id: payment.id,
    storage_path: path,
    mime_type: file.type,
    file_name: file.name,
  });

  let extracted;
  try {
    extracted = await extractPaymentDetails(bytes, file.type as (typeof ALLOWED_TYPES)[number]);
  } catch {
    extracted = {
      structured: {
        amount: null, transactionDate: null, transactionTime: null, referenceNumber: null,
        payerName: null, payeeName: null, paymentApp: null, paymentMethod: null,
        notes: "We couldn't read this payment automatically.", confidence: 0,
      },
      raw: null,
    };
  }

  await supabase.from("ocr_results").insert({
    payment_id: payment.id,
    provider: "claude",
    raw_result: extracted.raw as never,
    structured_result: extracted.structured as never,
    confidence: extracted.structured.confidence,
    processed_at: new Date().toISOString(),
  });

  return {
    paymentId: payment.id,
    amount: extracted.structured.amount,
    transactionDate: extracted.structured.transactionDate,
    transactionTime: extracted.structured.transactionTime,
    referenceNumber: extracted.structured.referenceNumber,
    payerName: extracted.structured.payerName,
    paymentApp: extracted.structured.paymentApp,
    paymentMethod: extracted.structured.paymentMethod,
    notes: extracted.structured.notes,
    confidence: extracted.structured.confidence,
  };
}

export async function confirmUploadedPayment(formData: FormData) {
  const paymentId = formData.get("paymentId") as string;
  const ledgerId = formData.get("ledgerId") as string;
  const tenantId = formData.get("tenantId") as string;
  const amount = Number(formData.get("amount"));
  const transactionDate = (formData.get("transactionDate") as string) || null;
  const transactionTime = (formData.get("transactionTime") as string) || null;
  const referenceNumber = (formData.get("referenceNumber") as string) || null;
  const payerName = (formData.get("payerName") as string) || null;
  const paymentMethod = (formData.get("paymentMethod") as string) || null;
  const paymentApp = (formData.get("paymentApp") as string) || null;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("confirm_payment", {
    p_payment_id: paymentId,
    p_monthly_ledger_id: ledgerId,
    p_tenant_id: tenantId,
    p_amount: amount,
    p_transaction_date: transactionDate,
    p_transaction_time: transactionTime,
    p_reference_number: referenceNumber,
    p_payer_name: payerName,
    p_payment_method: paymentMethod,
    p_payment_app: paymentApp,
  });
  if (error) throw error;

  revalidatePath(`/ledger/${ledgerId}`);
  revalidatePath("/");
  redirect(`/ledger/${ledgerId}`);
}

export async function cancelUpload(paymentId: string, ledgerId: string) {
  const supabase = createAdminClient();

  const { data: media } = await supabase
    .from("payment_media")
    .select("storage_path")
    .eq("payment_id", paymentId);
  if (media && media.length > 0) {
    await supabase.storage.from("payment-screenshots").remove(media.map((m) => m.storage_path));
  }
  await supabase.from("payments").delete().eq("id", paymentId);

  redirect(`/ledger/${ledgerId}`);
}

import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentDetail = {
  id: string;
  ledgerId: string | null;
  tenantId: string | null;
  unitName: string | null;
  tenantName: string | null;
  amount: number;
  transactionDate: string | null;
  transactionTime: string | null;
  referenceNumber: string | null;
  payerName: string | null;
  paymentMethod: string | null;
  paymentApp: string | null;
  status: string;
  source: string;
  confirmedAt: string | null;
  createdAt: string;
  screenshotUrl: string | null;
  ocr: {
    amount: number | null;
    transactionDate: string | null;
    payerName: string | null;
    paymentApp: string | null;
    paymentMethod: string | null;
    confidence: number | null;
    notes: string | null;
  } | null;
};

export async function getPaymentDetail(paymentId: string): Promise<PaymentDetail | null> {
  const supabase = createAdminClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      "id, monthly_ledger_id, tenant_id, amount, transaction_date, transaction_time, reference_number, payer_name, payment_method, payment_app, status, source, confirmed_at, created_at, monthly_ledgers(units(name), tenancies(tenants(name)))"
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw error;
  if (!payment) return null;

  const ledger = Array.isArray(payment.monthly_ledgers) ? payment.monthly_ledgers[0] : payment.monthly_ledgers;
  const unit = ledger ? (Array.isArray(ledger.units) ? ledger.units[0] : ledger.units) : null;
  const tenancy = ledger ? (Array.isArray(ledger.tenancies) ? ledger.tenancies[0] : ledger.tenancies) : null;
  const tenant = tenancy ? (Array.isArray(tenancy.tenants) ? tenancy.tenants[0] : tenancy.tenants) : null;

  const { data: media } = await supabase
    .from("payment_media")
    .select("storage_path")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let screenshotUrl: string | null = null;
  if (media) {
    const { data: signed } = await supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(media.storage_path, 600);
    screenshotUrl = signed?.signedUrl ?? null;
  }

  const { data: ocr } = await supabase
    .from("ocr_results")
    .select("structured_result, confidence")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  type Structured = {
    amount: number | null;
    transactionDate: string | null;
    payerName: string | null;
    paymentApp: string | null;
    paymentMethod: string | null;
    notes: string | null;
  };
  const structured = ocr?.structured_result as Structured | undefined;

  return {
    id: payment.id,
    ledgerId: payment.monthly_ledger_id,
    tenantId: payment.tenant_id,
    unitName: unit?.name ?? null,
    tenantName: tenant?.name ?? null,
    amount: Number(payment.amount),
    transactionDate: payment.transaction_date,
    transactionTime: payment.transaction_time,
    referenceNumber: payment.reference_number,
    payerName: payment.payer_name,
    paymentMethod: payment.payment_method,
    paymentApp: payment.payment_app,
    status: payment.status,
    source: payment.source,
    confirmedAt: payment.confirmed_at,
    createdAt: payment.created_at,
    screenshotUrl,
    ocr: ocr
      ? {
          amount: structured?.amount ?? null,
          transactionDate: structured?.transactionDate ?? null,
          payerName: structured?.payerName ?? null,
          paymentApp: structured?.paymentApp ?? null,
          paymentMethod: structured?.paymentMethod ?? null,
          confidence: ocr.confidence,
          notes: structured?.notes ?? null,
        }
      : null,
  };
}

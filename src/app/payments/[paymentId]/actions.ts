"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmPendingPayment(formData: FormData) {
  const paymentId = formData.get("paymentId") as string;
  const ledgerId = formData.get("ledgerId") as string;
  const tenantId = formData.get("tenantId") as string;
  const amount = Number(formData.get("amount"));
  const transactionDate = (formData.get("transactionDate") as string) || null;
  const referenceNumber = (formData.get("referenceNumber") as string) || null;
  const payerName = (formData.get("payerName") as string) || null;
  const paymentMethod = (formData.get("paymentMethod") as string) || null;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("confirm_payment", {
    p_payment_id: paymentId,
    p_monthly_ledger_id: ledgerId,
    p_tenant_id: tenantId,
    p_amount: amount,
    p_transaction_date: transactionDate,
    p_transaction_time: null,
    p_reference_number: referenceNumber,
    p_payer_name: payerName,
    p_payment_method: paymentMethod,
    p_payment_app: null,
  });
  if (error) throw error;

  revalidatePath(`/ledger/${ledgerId}`);
  revalidatePath("/");
  redirect(`/ledger/${ledgerId}`);
}

export async function rejectPendingPayment(formData: FormData) {
  const paymentId = formData.get("paymentId") as string;
  const ledgerId = formData.get("ledgerId") as string;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("reject_payment", { p_payment_id: paymentId });
  if (error) throw error;

  revalidatePath(`/ledger/${ledgerId}`);
  revalidatePath("/");
  redirect(`/ledger/${ledgerId}`);
}

export async function editPayment(formData: FormData) {
  const paymentId = formData.get("paymentId") as string;
  const ledgerId = formData.get("ledgerId") as string;
  const amount = Number(formData.get("amount"));
  const transactionDate = (formData.get("transactionDate") as string) || null;
  const referenceNumber = (formData.get("referenceNumber") as string) || null;
  const payerName = (formData.get("payerName") as string) || null;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("edit_confirmed_payment", {
    p_payment_id: paymentId,
    p_amount: amount,
    p_transaction_date: transactionDate,
    p_reference_number: referenceNumber,
    p_payer_name: payerName,
  });
  if (error) throw error;

  revalidatePath(`/ledger/${ledgerId}`);
  revalidatePath("/");
  redirect(`/payments/${paymentId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function addAdjustment(formData: FormData) {
  const ledgerId = formData.get("ledgerId") as string;
  const type = formData.get("type") as string;
  const rawAmount = Number(formData.get("amount"));
  const reason = formData.get("reason") as string;
  const notes = (formData.get("notes") as string) || null;

  // Charges add to the balance, credits/waivers reduce it — store a single
  // signed delta so total_due = base_rent + water_charge + sum(adjustments).
  const amount = type === "charge" ? Math.abs(rawAmount) : -Math.abs(rawAmount);

  const supabase = createAdminClient();
  const { error } = await supabase.from("adjustments").insert({
    monthly_ledger_id: ledgerId,
    amount,
    type,
    reason,
    notes,
  });
  if (error) throw error;

  revalidatePath(`/ledger/${ledgerId}`);
  revalidatePath("/");
  redirect(`/ledger/${ledgerId}`);
}

export async function deletePaymentAction(formData: FormData) {
  const paymentId = formData.get("paymentId") as string;
  const ledgerId = formData.get("ledgerId") as string;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("delete_payment", { p_payment_id: paymentId });
  if (error) throw error;

  revalidatePath(`/ledger/${ledgerId}`);
  revalidatePath("/");
  redirect(`/ledger/${ledgerId}`);
}

export async function editConfirmedPaymentAction(formData: FormData) {
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
  redirect(`/ledger/${ledgerId}`);
}

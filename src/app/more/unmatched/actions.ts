"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function assignUnmatchedPayment(formData: FormData) {
  const paymentId = formData.get("paymentId") as string;
  const tenancyId = formData.get("tenancyId") as string;
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  const supabase = createAdminClient();

  const { data: ledgerId, error: ledgerError } = await supabase.rpc("ensure_monthly_ledger", {
    p_tenancy_id: tenancyId,
    p_year: year,
    p_month: month,
  });
  if (ledgerError) throw ledgerError;

  const { data: tenancy } = await supabase.from("tenancies").select("tenant_id").eq("id", tenancyId).single();

  const { error } = await supabase.rpc("assign_unmatched_payment", {
    p_payment_id: paymentId,
    p_monthly_ledger_id: ledgerId,
    p_tenant_id: tenancy?.tenant_id,
  });
  if (error) throw error;

  revalidatePath("/more/unmatched");
  revalidatePath("/");
}

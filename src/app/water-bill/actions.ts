"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyId } from "@/lib/data/property";

export async function saveWaterBill(formData: FormData) {
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const totalAmount = Number(formData.get("totalAmount"));
  const billDate = (formData.get("billDate") as string) || null;
  const dueDate = (formData.get("dueDate") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const file = formData.get("document") as File | null;

  const supabase = createAdminClient();
  const propertyId = await getPropertyId();

  let documentPath: string | null = null;
  if (file && file.size > 0) {
    const extension = file.name.split(".").pop() || "bin";
    const path = `${propertyId}/${year}-${month}-${crypto.randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("tenant-documents")
      .upload(path, bytes, { contentType: file.type });
    if (uploadError) throw uploadError;
    documentPath = path;
  }

  const { error } = await supabase.rpc("set_water_bill", {
    p_property_id: propertyId,
    p_year: year,
    p_month: month,
    p_total_amount: totalAmount,
    p_bill_date: billDate,
    p_due_date: dueDate,
    p_document_path: documentPath,
    p_notes: notes,
  });
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/water-bill");
  redirect(`/water-bill?year=${year}&month=${month}&saved=1`);
}

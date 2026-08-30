"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export async function createTenant(formData: FormData) {
  const unitId = formData.get("unitId") as string;
  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const monthlyRent = Number(formData.get("monthlyRent"));
  const securityDeposit = Number(formData.get("securityDeposit") || 0);
  const leaseStartDate = formData.get("leaseStartDate") as string;
  const leaseEndDate = (formData.get("leaseEndDate") as string) || null;
  const rentDueDay = Number(formData.get("rentDueDay") || 10);
  const emergencyContact = (formData.get("emergencyContact") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const supabase = createAdminClient();

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name, phone, email, emergency_contact: emergencyContact, notes })
    .select("id")
    .single();
  if (tenantError) throw tenantError;

  const { error: tenancyError } = await supabase.from("tenancies").insert({
    tenant_id: tenant.id,
    unit_id: unitId,
    lease_start_date: leaseStartDate,
    lease_end_date: leaseEndDate,
    monthly_rent: monthlyRent,
    security_deposit: securityDeposit,
    rent_due_day: rentDueDay,
    status: "active",
  });
  if (tenancyError) throw tenancyError;

  revalidatePath("/tenants");
  revalidatePath("/");
  redirect(`/tenants/${tenant.id}`);
}

export async function endTenancy(formData: FormData) {
  const tenancyId = formData.get("tenancyId") as string;
  const tenantId = formData.get("tenantId") as string;
  const moveOutDate = formData.get("moveOutDate") as string;
  const finalNotes = (formData.get("finalNotes") as string) || null;
  const depositReturned = formData.get("depositReturned")
    ? Number(formData.get("depositReturned"))
    : null;
  const depositDeductions = formData.get("depositDeductions")
    ? Number(formData.get("depositDeductions"))
    : null;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("end_tenancy", {
    p_tenancy_id: tenancyId,
    p_move_out_date: moveOutDate,
    p_final_notes: finalNotes,
    p_deposit_returned: depositReturned,
    p_deposit_deductions: depositDeductions,
  });
  if (error) throw error;

  revalidatePath("/tenants");
  revalidatePath("/");
  redirect(`/tenants/${tenantId}`);
}

/**
 * Hard-deletes a tenant and everything scoped to them — tenancies, monthly
 * ledgers, adjustments, water allocations, and documents (cascades in the
 * DB) — plus their stored document files. Payments already recorded stay
 * (tenant_id/monthly_ledger_id just go null), so a real transaction history
 * is never silently erased by this. Use this only to undo a mistaken entry;
 * for an actual move-out, use End Tenancy so past occupancy stays accurate.
 */
export async function deleteTenant(formData: FormData) {
  const tenantId = formData.get("tenantId") as string;

  const supabase = createAdminClient();

  const { data: docs } = await supabase
    .from("tenant_documents")
    .select("storage_path")
    .eq("tenant_id", tenantId);
  if (docs && docs.length > 0) {
    await supabase.storage.from("tenant-documents").remove(docs.map((d) => d.storage_path));
  }

  const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
  if (error) throw error;

  revalidatePath("/tenants");
  revalidatePath("/");
  redirect("/tenants");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function uploadTenantDocument(formData: FormData) {
  const tenantId = formData.get("tenantId") as string;
  const tenancyId = (formData.get("tenancyId") as string) || null;
  const category = (formData.get("category") as string) || "other";
  const description = (formData.get("description") as string) || null;
  const file = formData.get("file") as File;

  if (!file || file.size === 0) return; // optional — nothing to do

  if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Unsupported file type — use PDF, PNG, JPEG, or WEBP");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("File is too large (max 15MB)");
  }

  const supabase = createAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFileName(file.name);
  const path = `${tenantId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("tenant-documents")
    .upload(path, bytes, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("tenant_documents").insert({
    tenant_id: tenantId,
    tenancy_id: tenancyId,
    category,
    file_name: safeName,
    storage_path: path,
    mime_type: file.type,
    description,
  });
  if (insertError) throw insertError;

  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}`);
}

export async function deleteTenantDocument(formData: FormData) {
  const documentId = formData.get("documentId") as string;
  const tenantId = formData.get("tenantId") as string;

  const supabase = createAdminClient();
  const { data: doc, error: fetchError } = await supabase
    .from("tenant_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();
  if (fetchError) throw fetchError;

  await supabase.storage.from("tenant-documents").remove([doc.storage_path]);

  const { error: deleteError } = await supabase.from("tenant_documents").delete().eq("id", documentId);
  if (deleteError) throw deleteError;

  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}`);
}

export async function renameTenantDocument(formData: FormData) {
  const documentId = formData.get("documentId") as string;
  const tenantId = formData.get("tenantId") as string;
  const newName = sanitizeFileName(formData.get("fileName") as string);

  const supabase = createAdminClient();
  const { error } = await supabase.from("tenant_documents").update({ file_name: newName }).eq("id", documentId);
  if (error) throw error;

  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}`);
}

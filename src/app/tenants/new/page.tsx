import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewTenantForm } from "./NewTenantForm";

export const dynamic = "force-dynamic";

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>;
}) {
  const { unit: unitId } = await searchParams;
  if (!unitId) notFound();

  const supabase = createAdminClient();
  const { data: unit } = await supabase.from("units").select("id, name").eq("id", unitId).maybeSingle();
  if (!unit) notFound();

  return (
    <div className="px-5 pb-8 pt-8">
      <p className="text-xl font-semibold tracking-tight text-[#2A2724]">Add Tenant</p>
      <p className="mt-1 text-sm text-[#8A8478]">{unit.name}</p>
      <NewTenantForm unitId={unit.id} />
    </div>
  );
}

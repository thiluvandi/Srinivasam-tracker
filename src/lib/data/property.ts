import { createAdminClient } from "@/lib/supabase/admin";

let cachedPropertyId: string | null = null;

/** There is exactly one property. Fetched once per server process. */
export async function getPropertyId(): Promise<string> {
  if (cachedPropertyId) return cachedPropertyId;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("properties").select("id").limit(1).single();
  if (error) throw error;
  cachedPropertyId = data.id;
  return data.id;
}

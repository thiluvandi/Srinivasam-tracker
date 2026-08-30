import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. This app has no per-request Supabase Auth
 * session (auth is a single owner PIN, see lib/auth) — every table has RLS
 * enabled with zero policies, so only this service-role client can read or
 * write anything. Never import this file from a Client Component.
 */
export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

import "server-only";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;

export type PinCheckResult =
  | { ok: true }
  | { ok: false; reason: "not_set" }
  | { ok: false; reason: "locked"; lockedUntil: string }
  | { ok: false; reason: "incorrect"; attemptsRemaining: number };

export async function isPinConfigured(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("app_auth").select("id").eq("id", 1).maybeSingle();
  return data !== null;
}

export async function setPin(pin: string): Promise<void> {
  const pinHash = await bcrypt.hash(pin, 10);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("app_auth")
    .upsert({ id: 1, pin_hash: pinHash, failed_attempts: 0, locked_until: null });
  if (error) throw error;
}

export async function checkPin(pin: string): Promise<PinCheckResult> {
  const supabase = createAdminClient();
  const { data: auth } = await supabase
    .from("app_auth")
    .select("pin_hash, failed_attempts, locked_until")
    .eq("id", 1)
    .maybeSingle();

  if (!auth) return { ok: false, reason: "not_set" };

  if (auth.locked_until && new Date(auth.locked_until) > new Date()) {
    return { ok: false, reason: "locked", lockedUntil: auth.locked_until };
  }

  const matches = await bcrypt.compare(pin, auth.pin_hash);

  if (matches) {
    await supabase.from("app_auth").update({ failed_attempts: 0, locked_until: null }).eq("id", 1);
    return { ok: true };
  }

  const attempts = auth.failed_attempts + 1;
  const lockedUntil =
    attempts >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
      : null;

  await supabase
    .from("app_auth")
    .update({ failed_attempts: lockedUntil ? 0 : attempts, locked_until: lockedUntil })
    .eq("id", 1);

  if (lockedUntil) {
    return { ok: false, reason: "locked", lockedUntil };
  }
  return { ok: false, reason: "incorrect", attemptsRemaining: MAX_ATTEMPTS - attempts };
}

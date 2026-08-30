"use server";

import { redirect } from "next/navigation";
import { setPin, checkPin } from "@/lib/auth/pin";
import { createSession } from "@/lib/auth/session";

export type UnlockResult = { error?: string };

export async function completeSetup(pin: string, next: string): Promise<void> {
  await setPin(pin);
  await createSession();
  redirect(next);
}

export async function attemptUnlock(pin: string, next: string): Promise<UnlockResult> {
  const result = await checkPin(pin);

  if (result.ok) {
    await createSession();
    redirect(next);
  }

  if (result.reason === "locked") {
    const until = new Date(result.lockedUntil);
    const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
    return { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }
  if (result.reason === "incorrect") {
    return { error: `Incorrect PIN. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? "" : "s"} left.` };
  }
  return { error: "PIN not set up yet." };
}

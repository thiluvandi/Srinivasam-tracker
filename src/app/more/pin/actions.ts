"use server";

import { checkPin, setPin } from "@/lib/auth/pin";

export async function verifyCurrentPin(pin: string): Promise<{ error?: string }> {
  const result = await checkPin(pin);
  if (result.ok) return {};
  if (result.reason === "locked") return { error: "Too many attempts. Try again later." };
  if (result.reason === "incorrect") return { error: "Incorrect PIN." };
  return { error: "PIN not set up." };
}

export async function saveNewPin(pin: string): Promise<void> {
  await setPin(pin);
}

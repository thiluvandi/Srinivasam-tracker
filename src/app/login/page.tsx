import { isPinConfigured } from "@/lib/auth/pin";
import { SetupFlow, UnlockFlow } from "./LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next !== "/login" ? next : "/";
  const configured = await isPinConfigured();

  return configured ? <UnlockFlow next={target} /> : <SetupFlow next={target} />;
}

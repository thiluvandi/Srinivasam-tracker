"use client";

import { useState, useTransition } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PinPad({
  title,
  subtitle,
  errorMessage,
  onSubmit,
}: {
  title: string;
  subtitle?: string;
  errorMessage?: string;
  onSubmit: (pin: string) => Promise<void>;
}) {
  const [digits, setDigits] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function press(key: string) {
    if (isPending) return;
    if (key === "⌫") {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (key === "" || digits.length >= 4) return;

    const next = digits + key;
    setDigits(next);
    if (next.length === 4) {
      startTransition(async () => {
        await onSubmit(next);
        setDigits("");
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F7F3] px-6">
      <div className="w-full max-w-xs text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="mx-auto h-20 w-20 rounded-full" />
        <p className="mt-3 text-2xl font-semibold tracking-tight text-[#2A2724]">Srinivasam</p>
        <p className="mt-8 text-base text-[#2A2724]">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-[#8A8478]">{subtitle}</p>}

        <div className="mt-6 flex justify-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border border-[#C9C2B4] ${
                i < digits.length ? "bg-[#2A2724]" : "bg-transparent"
              }`}
            />
          ))}
        </div>

        {errorMessage && (
          <p className="mt-4 text-sm text-[#B4694A]" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="mt-10 grid grid-cols-3 gap-4">
          {KEYS.map((key, i) => (
            <button
              key={i}
              type="button"
              disabled={key === "" || isPending}
              onClick={() => press(key)}
              className="flex h-16 items-center justify-center rounded-full text-xl font-medium text-[#2A2724] transition-colors active:bg-[#EEEAE0] disabled:opacity-0"
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

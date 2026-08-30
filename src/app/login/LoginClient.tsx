"use client";

import { useState } from "react";
import { PinPad } from "@/components/PinPad";
import { completeSetup, attemptUnlock } from "./actions";

export function SetupFlow({ next }: { next: string }) {
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  if (firstPin === null) {
    return (
      <PinPad
        title="Create a 4-digit PIN"
        onSubmit={async (pin) => {
          setFirstPin(pin);
        }}
      />
    );
  }

  return (
    <PinPad
      title="Confirm your PIN"
      errorMessage={error}
      onSubmit={async (pin) => {
        if (pin !== firstPin) {
          setError("PINs didn't match — try again.");
          setFirstPin(null);
          return;
        }
        await completeSetup(pin, next);
      }}
    />
  );
}

export function UnlockFlow({ next }: { next: string }) {
  const [error, setError] = useState<string | undefined>();

  return (
    <PinPad
      title="Enter PIN"
      errorMessage={error}
      onSubmit={async (pin) => {
        const result = await attemptUnlock(pin, next);
        if (result?.error) setError(result.error);
      }}
    />
  );
}

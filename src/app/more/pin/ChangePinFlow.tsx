"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PinPad } from "@/components/PinPad";
import { verifyCurrentPin, saveNewPin } from "./actions";

export function ChangePinFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<"current" | "new" | "confirm">("current");
  const [firstNewPin, setFirstNewPin] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  if (stage === "current") {
    return (
      <PinPad
        title="Enter current PIN"
        errorMessage={error}
        onSubmit={async (pin) => {
          const result = await verifyCurrentPin(pin);
          if (result.error) {
            setError(result.error);
            return;
          }
          setError(undefined);
          setStage("new");
        }}
      />
    );
  }

  if (stage === "new") {
    return (
      <PinPad
        title="Create a new PIN"
        onSubmit={async (pin) => {
          setFirstNewPin(pin);
          setStage("confirm");
        }}
      />
    );
  }

  return (
    <PinPad
      title="Confirm new PIN"
      errorMessage={error}
      onSubmit={async (pin) => {
        if (pin !== firstNewPin) {
          setError("PINs didn't match — try again.");
          setStage("new");
          setFirstNewPin(null);
          return;
        }
        await saveNewPin(pin);
        router.push("/more");
      }}
    />
  );
}

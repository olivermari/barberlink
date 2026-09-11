"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const METHOD = "gcash";
const PRESETS = [200, 500, 1000];
// PayMongo won't open a payment under ₱20.
const MIN_TOPUP = 20;

export function WalletTopupForm() {
  const router = useRouter();
  const [choice, setChoice] = useState<number | "other">(500);
  const [other, setOther] = useState("");
  const [loading, setLoading] = useState(false);

  const amount = choice === "other" ? Math.round(Number(other) || 0) : choice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount < MIN_TOPUP) {
      toast.error(`Top up at least ₱${MIN_TOPUP}.`);
      return;
    }
    setLoading(true);

    const res = await fetch("/api/payments/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method: METHOD }),
    });
    const result = await res.json();

    if (!res.ok) {
      setLoading(false);
      toast.error(result.error ?? "Top-up couldn't be started.");
      return;
    }

    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }

    setLoading(false);
    toast.success("Top-up simulated — marked paid for testing.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-2.5">
      <div className="flex gap-2" role="radiogroup" aria-label="Top-up amount">
        {PRESETS.map((v) => (
          <Chip
            key={v}
            label={`₱${v.toLocaleString("en-US")}`}
            selected={choice === v}
            onClick={() => setChoice(v)}
          />
        ))}
        <Chip label="Other" selected={choice === "other"} onClick={() => setChoice("other")} />
      </div>
      {choice === "other" && (
        <Input
          type="number"
          inputMode="numeric"
          min={MIN_TOPUP}
          placeholder={`Amount in ₱ (${MIN_TOPUP} or more)`}
          aria-label="Top-up amount"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          className="h-12 border-[1.5px] border-outline"
        />
      )}
      <Button type="submit" size="lg" className="h-12 text-base" disabled={loading || amount <= 0}>
        {loading ? "Opening GCash…" : amount > 0 ? `Top up ₱${amount.toLocaleString("en-US")}` : "Top up wallet"}
      </Button>
    </form>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "h-11 flex-1 rounded-[5px] text-sm",
        selected ? "border-2 border-primary font-bold" : "border-[1.5px] border-outline font-semibold",
      )}
    >
      {label}
    </button>
  );
}

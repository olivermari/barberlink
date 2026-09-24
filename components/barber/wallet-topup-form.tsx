"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Caption } from "@/components/customer/ui";

const METHOD = "gcash";
const PRESETS = [200, 500, 1000];
// PayMongo won't open a payment under ₱20.
const MIN_TOPUP = 20;

// Barber UI B5 / W2's wallet: the red-outlined card with the balance and
// the Top up button, and the ₱200 / ₱500 / ₱1,000 / Other chips under it.
// One component so the button and the chips share the chosen amount.
export function WalletCard({
  balance,
  copy,
  className,
}: {
  balance: number;
  copy: string;
  className?: string;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<number | "other">(500);
  const [other, setOther] = useState("");
  const [loading, setLoading] = useState(false);

  const amount = choice === "other" ? Math.round(Number(other) || 0) : choice;

  async function topUp() {
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
    <div className={cn("flex flex-col gap-3 lg:gap-[13px]", className)}>
      <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-primary bg-white p-[15px] shadow-[0_8px_20px_rgba(22,19,15,0.09)] lg:p-4 lg:shadow-none">
        <div className="flex items-center justify-between gap-2.5">
          <Caption>Token wallet</Caption>
          <span className="text-xs text-faint lg:hidden">Commission drawn from here</span>
        </div>
        <span
          className={cn(
            "text-[38px] leading-none font-extrabold tracking-[-0.03em] lg:text-[40px]",
            balance < 0 && "text-destructive",
          )}
        >
          {formatPeso(balance)}
        </span>
        <p className="text-[13.5px] leading-[1.5] text-[#4c463d]">{copy}</p>
        <button
          type="button"
          onClick={topUp}
          disabled={loading || amount <= 0}
          className="rounded-[11px] bg-primary p-3.5 text-center text-[15px] font-bold text-white disabled:opacity-60"
        >
          {loading ? "Opening GCash…" : "Top up wallet"}
        </button>
      </div>

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
        <input
          type="number"
          inputMode="numeric"
          min={MIN_TOPUP}
          placeholder={`Amount in ₱ (${MIN_TOPUP} or more)`}
          aria-label="Top-up amount"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          className="h-12 rounded-[10px] border border-field bg-white px-3.5 text-[15px] outline-none focus:border-foreground"
        />
      )}
    </div>
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
        "flex-1 rounded-[10px] border p-[11px] text-center text-sm font-bold transition-colors",
        selected ? "border-foreground bg-foreground text-background" : "border-line bg-white",
      )}
    >
      {label}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const METHOD = "gcash";

export function WalletTopupForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/payments/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), method: METHOD }),
    });
    const result = await res.json();

    setLoading(false);

    if (!res.ok) {
      toast.error(result.error ?? "Top-up couldn't be started.");
      return;
    }

    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }

    toast.success(
      "Top-up simulated — PayMongo isn't configured yet, so this was marked paid automatically for testing.",
    );
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="topupAmount">Amount (₱)</Label>
        <Input
          id="topupAmount"
          type="number"
          min={1}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <p className="text-sm text-muted-foreground sm:pb-2">via GCash</p>
      <Button type="submit" disabled={loading || !amount}>
        {loading ? "Processing..." : "Top up"}
      </Button>
    </form>
  );
}

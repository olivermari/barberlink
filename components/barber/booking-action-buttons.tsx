"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NEXT_STEP: Record<string, { status: string; label: string; done: string }> = {
  accepted: { status: "on_the_way", label: "On my way", done: "The customer knows you're on the way." },
  on_the_way: { status: "in_service", label: "Start service", done: "Service started." },
  in_service: { status: "completed", label: "Complete job", done: "Job complete." },
};

// The one primary action on an active job (B3 / B6). Accept and Decline
// live on the incoming-request card instead.
export function NextStepButton({
  bookingId,
  barberId,
  status,
  cashCommission,
  className,
}: {
  bookingId: string;
  barberId: string;
  status: string;
  // Set for cash jobs: completing one settles it and draws this from the
  // wallet (0018).
  cashCommission?: number | null;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const next = NEXT_STEP[status];
  if (!next) return null;

  const settlesCash = next.status === "completed" && cashCommission != null;

  async function advance() {
    setLoading(true);
    const supabase = createClient();
    // Guarded on the current status so a customer's cancel that lands
    // first isn't overwritten.
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: next.status })
      .eq("id", bookingId)
      .eq("status", status)
      .select("id")
      .maybeSingle();

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (!data) {
      setLoading(false);
      toast.info("This booking changed — here's the latest.");
      router.refresh();
      return;
    }

    if (settlesCash) {
      const { data: wallet } = await supabase
        .from("barber_profiles")
        .select("token_balance")
        .eq("id", barberId)
        .single();
      const balance = Number(wallet?.token_balance ?? 0);
      toast.success(`Job complete — ₱${cashCommission} commission drawn from your wallet.`);
      if (balance < 0) {
        toast.warning(
          `Your wallet is at ₱${balance}, so you're offline. Top up on Earnings to take new jobs.`,
        );
      }
    } else {
      toast.success(next.done);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="lg" className={cn("h-14 text-lg", className)} onClick={advance} disabled={loading}>
      {loading ? "Updating…" : settlesCash ? "Complete job · cash collected" : next.label}
    </Button>
  );
}

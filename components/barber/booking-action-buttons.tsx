"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { cn } from "@/lib/utils";
import { PRIMARY_ACTION } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const NEXT_STEP: Record<string, { status: string; label: string; done: string }> = {
  accepted: { status: "on_the_way", label: "On my way", done: "The customer knows you're on the way." },
  on_the_way: { status: "in_service", label: "I've arrived", done: "Service started." },
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
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      toast.error(friendlyError(error, "Couldn't update that job. Try again."));
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

  // Completing a job is irreversible and, on a cash job, immediately
  // draws commission from the wallet and can take the barber offline —
  // it sits right above the tab bar, so a confirm step guards against a
  // stray tap. "On my way" / "Start service" stay single-tap.
  if (next.status !== "completed") {
    return (
      <Button className={cn(PRIMARY_ACTION, className)} onClick={advance} disabled={loading}>
        {loading ? "Updating…" : next.label}
      </Button>
    );
  }

  return (
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogTrigger render={<Button className={cn(PRIMARY_ACTION, className)} />}>
        {next.label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{settlesCash ? "Cash collected?" : "Complete this job?"}</DialogTitle>
          <DialogDescription>
            {settlesCash
              ? `This draws ₱${cashCommission} commission from your wallet and can't be undone. Only confirm once you've collected payment in person.`
              : "This marks the job done and can't be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Not yet</DialogClose>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              advance();
            }}
            disabled={loading}
          >
            {loading ? "Updating…" : "Yes, complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

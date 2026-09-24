"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/cancel-booking-button";

// The queue state of Track (the design has no queued screen, so it's
// drawn from the same card language). Queue wait is the moment customers
// abandon, so the way back to Quick Match sits inside the card. The copy
// stays honest: the barber takes whoever's nearest next (0007's promote
// trigger), so there's no "you're 2nd" and no ETA.
export function QueueCard({
  bookingId,
  barberId,
  barberName,
  queueDepth,
  detailHref,
}: {
  bookingId: string;
  barberId: string;
  barberName: string;
  // queue_depth() counts every queued booking for the barber, this one
  // included.
  queueDepth: number | null;
  detailHref?: string;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const others = queueDepth != null ? Math.max(0, queueDepth - 1) : null;

  const copy =
    others == null
      ? `${barberName} is finishing another job. We'll notify you the moment it's your turn.`
      : others === 0
        ? `${barberName} is finishing another job and nobody else is waiting. We'll notify you the moment it's your turn.`
        : `${others} other${others === 1 ? "" : "s"} waiting — ${barberName} takes whoever's nearest next, so it isn't strictly first-come. We'll notify you the moment it's your turn.`;

  async function quickMatchInstead() {
    setSwitching(true);
    const supabase = createClient();
    // Only cancel if it's still queued — if the barber just picked it up,
    // the customer should keep that booking, not lose it.
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setSwitching(false);
      toast.error(error ? friendlyError(error) : "It's your turn now — your barber is on it.");
      router.refresh();
      return;
    }

    router.push(`/customer?match=1&exclude=${barberId}`);
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-foreground p-[15px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold">{`You're in ${barberName}'s queue`}</h2>
        {detailHref && (
          <Link href={detailHref} className="shrink-0 text-[13px] font-bold text-primary">
            Details
          </Link>
        )}
      </div>
      <p className="text-[13px] leading-[1.45] text-[#6a635a]">{copy}</p>
      <div className="mt-0.5 flex gap-2">
        <Button className="h-11 flex-1 rounded-[10px] text-[15px] font-bold" onClick={quickMatchInstead} disabled={switching}>
          {switching ? "Switching…" : "Quick Match instead"}
        </Button>
        <CancelBookingButton
          bookingId={bookingId}
          status="queued"
          label="Cancel"
          className="h-11 rounded-[10px] border border-foreground px-4 font-bold"
        />
      </div>
    </div>
  );
}

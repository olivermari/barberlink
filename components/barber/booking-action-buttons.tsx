"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  accepted: { status: "on_the_way", label: "On my way" },
  on_the_way: { status: "in_service", label: "Start service" },
  in_service: { status: "completed", label: "Complete" },
};

export function BookingActionButtons({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function setStatus(next: string, successMessage: string) {
    setLoading(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status: next })
      .eq("id", bookingId);
    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(successMessage);
    router.refresh();
  }

  if (status === "pending") {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading !== null}
          onClick={() => setStatus("declined", "Booking declined.")}
        >
          {loading === "declined" ? "Declining..." : "Decline"}
        </Button>
        <Button
          size="sm"
          disabled={loading !== null}
          onClick={() => setStatus("accepted", "Booking accepted.")}
        >
          {loading === "accepted" ? "Accepting..." : "Accept"}
        </Button>
      </div>
    );
  }

  const next = NEXT_STATUS[status];
  if (!next) return null;

  return (
    <Button
      size="sm"
      disabled={loading !== null}
      onClick={() => setStatus(next.status, `Marked as "${next.label}".`)}
    >
      {loading === next.status ? "Updating..." : next.label}
    </Button>
  );
}

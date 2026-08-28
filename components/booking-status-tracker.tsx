"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const STEPS: { status: string; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "accepted", label: "Accepted" },
  { status: "on_the_way", label: "On the way" },
  { status: "in_service", label: "In service" },
  { status: "completed", label: "Completed" },
];

const STATUS_TOAST: Record<string, string> = {
  pending: "You're up next!",
  accepted: "Your barber accepted the booking.",
  on_the_way: "Your barber is on the way!",
  in_service: "Your service has started.",
  completed: "Your service is complete.",
  declined: "Your barber declined this booking.",
  cancelled: "This booking was cancelled.",
};

export function BookingStatusTracker({
  bookingId,
  initialStatus,
  onStatusChange,
}: {
  bookingId: string;
  initialStatus: string;
  onStatusChange?: (status: string) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const statusRef = useRef(initialStatus);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      // Without this, the channel joins successfully but RLS silently
      // drops every event — the realtime client's auth sync from
      // @supabase/ssr's cookie-based session lags the initial subscribe.
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`booking-${bookingId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `id=eq.${bookingId}`,
          },
          (payload) => {
            const nextStatus = (payload.new as { status: string }).status;
            if (statusRef.current === nextStatus) return;
            statusRef.current = nextStatus;

            const message = STATUS_TOAST[nextStatus];
            if (message) toast.info(message);
            onStatusChange?.(nextStatus);
            setStatus(nextStatus);
          },
        )
        .subscribe();
    }

    start();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (status === "declined" || status === "cancelled") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {status === "declined"
          ? "This booking was declined by the barber."
          : "This booking was cancelled."}
      </div>
    );
  }

  if (status === "queued") {
    return (
      <div className="rounded-lg border px-4 py-3 text-sm">
        <p className="font-medium">You&apos;re in the queue</p>
        <p className="text-muted-foreground">
          This barber is currently busy. We&apos;ll notify you the moment
          it&apos;s your turn.
        </p>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex flex-col gap-0">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-3.5" /> : i + 1}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "my-0.5 h-8 w-0.5",
                    done ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
            <div
              className={cn(
                "pb-8 text-sm",
                active && "font-medium text-foreground",
                !active && (done ? "text-foreground" : "text-muted-foreground"),
              )}
            >
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

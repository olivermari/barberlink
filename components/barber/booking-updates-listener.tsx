"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function BookingUpdatesListener({ barberId }: { barberId: string }) {
  const router = useRouter();

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
      // drops every event — see components/booking-status-tracker.tsx.
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`barber-bookings-${barberId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bookings",
            filter: `barber_id=eq.${barberId}`,
          },
          (payload) => {
            const status = (payload.new as { status: string }).status;
            toast.info(
              status === "queued"
                ? "A new booking joined your queue."
                : "New booking request!",
            );
            router.refresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `barber_id=eq.${barberId}`,
          },
          (payload) => {
            const status = (payload.new as { status: string }).status;
            if (status === "pending") toast.info("You're up — a queued booking is now pending.");
            if (status === "cancelled") toast.info("A customer cancelled their booking.");
            router.refresh();
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
  }, [barberId]);

  return null;
}

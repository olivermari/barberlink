"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type ActiveBooking = {
  id: string;
  status: string;
  barberId: string;
  barberName: string;
};

const ACTIVE_STATUSES = ["queued", "pending", "accepted", "on_the_way", "in_service"];

const STATUS_LABEL: Record<string, string> = {
  queued: "You're in the queue",
  pending: "Waiting for your barber to accept",
  accepted: "Your barber accepted",
  on_the_way: "Your barber is on the way",
  in_service: "Your service is in progress",
};

// Lives inside the customer layout so it's mounted once and persists
// across tab switches (Book <-> Bookings) — the realtime subscription
// keeps it live without needing a full page reload. This is the "ambient
// presence" piece: a customer shouldn't have to open Bookings just to
// see whether their barber is close. It's also the one always-mounted
// place to fire OS notifications for status changes, chat messages, and
// dispute resolutions — see lib/notifications.ts. booking_messages and
// disputes are subscribed unfiltered: their own RLS already scopes
// select to this customer's rows, so Realtime only ever delivers what
// they're allowed to see.
export function ActiveBookingBar({
  customerId,
  initialBooking,
}: {
  customerId: string;
  initialBooking: ActiveBooking | null;
}) {
  const pathname = usePathname();
  const [booking, setBooking] = useState<ActiveBooking | null>(initialBooking);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function resolveName(id: string, fallback: string) {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", id).single();
      return data?.full_name ?? fallback;
    }
    const resolveBarberName = (barberId: string) => resolveName(barberId, "Your barber");

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      // Without this, the channel joins fine but RLS silently drops
      // every event — see components/customer/booking-view.tsx.
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`customer-active-booking-${customerId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bookings",
            filter: `customer_id=eq.${customerId}`,
          },
          async (payload) => {
            const row = payload.new as {
              id: string;
              status: string;
              barber_id: string;
            };
            if (!ACTIVE_STATUSES.includes(row.status)) return;
            const barberName = await resolveBarberName(row.barber_id);
            if (cancelled) return;
            setBooking({
              id: row.id,
              status: row.status,
              barberId: row.barber_id,
              barberName,
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `customer_id=eq.${customerId}`,
          },
          (payload) => {
            const row = payload.new as { id: string; status: string; barber_id: string };
            const label = STATUS_LABEL[row.status];
            if (label) {
              // Every STATUS_LABEL entry is an active status, so this is
              // always the customer's current booking — send it to the
              // Track tab rather than the id-specific detail route, so
              // the tab bar highlights correctly on arrival.
              notify({
                title: label,
                url: "/customer/track",
                tag: `booking-${row.id}`,
                toastFn: toast.info,
              });
            }
            setBooking((current) => {
              if (!ACTIVE_STATUSES.includes(row.status)) {
                return current?.id === row.id ? null : current;
              }
              if (current?.id === row.id) {
                return { ...current, status: row.status };
              }
              return current;
            });
          },
        )
        .on(
          "postgres_changes",
          // Unfiltered: booking_messages' own RLS already scopes select
          // to this booking's customer/barber/admin, so Realtime only
          // ever delivers messages this customer is a participant in.
          { event: "INSERT", schema: "public", table: "booking_messages" },
          async (payload) => {
            const row = payload.new as { booking_id: string; sender_id: string; body: string };
            if (row.sender_id === customerId || cancelled) return;
            const senderName = await resolveName(row.sender_id, "Your barber");
            if (cancelled) return;
            notify({
              title: `New message from ${senderName}`,
              body: row.body,
              url: `/customer/bookings/${row.booking_id}#chat`,
              tag: `chat-${row.booking_id}`,
              toastFn: toast.info,
            });
          },
        )
        .on(
          "postgres_changes",
          // Unfiltered: disputes_select already scopes to the raiser,
          // the booking's barber, and admins. This table (and
          // token_ledger, used by JobsBadgeProvider) had to be added to
          // the supabase_realtime publication (0023) — a binding for an
          // unpublished table silently breaks delivery for every other
          // binding on the same channel, not just its own.
          { event: "UPDATE", schema: "public", table: "disputes" },
          (payload) => {
            const row = payload.new as { booking_id: string; status: string };
            if (row.status !== "resolved" && row.status !== "dismissed") return;
            notify({
              title: "Your dispute was resolved",
              url: `/customer/bookings/${row.booking_id}`,
              tag: `dispute-${row.booking_id}`,
              toastFn: toast.info,
            });
          },
        )
        .subscribe();
    }

    start();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [customerId]);

  // The Track tab and the booking's own detail page already show all of
  // this.
  if (
    !booking ||
    pathname === "/customer/track" ||
    pathname === `/customer/bookings/${booking.id}`
  ) {
    return null;
  }

  return (
    <Link
      href="/customer/track"
      // On desktop Book the pinned track card already says this.
      className={cn(
        "flex items-center justify-between gap-3 bg-foreground px-4 py-2.5 text-[13.5px] text-background sm:px-6",
        pathname === "/customer" && "lg:hidden",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />
        <span className="truncate">
          <span className="font-semibold">{booking.barberName}</span>
          {" — "}
          <span className="opacity-75">{STATUS_LABEL[booking.status] ?? booking.status}</span>
        </span>
      </span>
      <span className="shrink-0 font-bold text-[#ff8a7d]">Track ›</span>
    </Link>
  );
}

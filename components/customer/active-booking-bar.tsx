"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
// see whether their barber is close.
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

    async function resolveBarberName(barberId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", barberId)
        .single();
      return data?.full_name ?? "Your barber";
    }

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
        .subscribe();
    }

    start();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [customerId]);

  // The bookings list and the booking's own page already show all of this.
  if (
    !booking ||
    pathname === "/customer/bookings" ||
    pathname === `/customer/bookings/${booking.id}`
  ) {
    return null;
  }

  return (
    <Link
      href={`/customer/bookings/${booking.id}`}
      className="flex items-center justify-between gap-3 bg-foreground px-4 py-2.5 text-sm text-background sm:px-6"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />
        <span className="truncate">
          <span className="font-semibold">{booking.barberName}</span>
          {" — "}
          <span className="opacity-75">{STATUS_LABEL[booking.status] ?? booking.status}</span>
        </span>
      </span>
      <span className="shrink-0 font-semibold">Track</span>
    </Link>
  );
}

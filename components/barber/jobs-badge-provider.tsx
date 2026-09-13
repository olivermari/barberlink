"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notifications";

const JobsBadgeContext = createContext(false);

export function useJobsBadge() {
  return useContext(JobsBadgeContext);
}

// Wraps every /barber/* route so the realtime subscription (and the
// "new job" flag it feeds) survives tab switches — a barber sitting on
// Earnings or Profile still needs to know a job landed. The flag clears
// itself the moment the barber lands back on the Jobs tab.
export function JobsBadgeProvider({
  barberId,
  children,
}: {
  barberId: string;
  children: React.ReactNode;
}) {
  const [hasNewJob, setHasNewJob] = useState(false);
  const [seenPathname, setSeenPathname] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Reset-on-navigation, done during render rather than in an effect —
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    if (pathname === "/barber") setHasNewJob(false);
  }

  // Tracks the last-seen wallet balance so the low-wallet notification
  // only fires on the drop below the minimum, not on every profile write.
  const lastBalanceRef = useRef<number | null>(null);
  const minWalletRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function resolveName(id: string, fallback: string) {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", id).single();
      return data?.full_name ?? fallback;
    }

    async function start() {
      const [{ data: session }, { data: minSetting }, { data: profile }] = await Promise.all([
        supabase.auth.getSession().then((r) => ({ data: r.data.session })),
        supabase.from("platform_settings").select("value").eq("key", "min_wallet_to_go_online").maybeSingle(),
        supabase.from("barber_profiles").select("token_balance").eq("id", barberId).single(),
      ]);
      if (cancelled) return;
      minWalletRef.current = Number(minSetting?.value ?? 0) || 0;
      lastBalanceRef.current = Number(profile?.token_balance ?? 0);
      // Without this, the channel joins fine but RLS silently drops
      // every event — see components/customer/booking-view.tsx.
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
            const row = payload.new as { id: string; status: string };
            // A pending request also gets the full-screen interrupt, which
            // the layout renders on this refresh — the notification is
            // what reaches a barber who's tabbed away entirely.
            if (row.status === "queued") {
              notify({
                title: "A new booking joined your queue.",
                url: "/barber",
                tag: `booking-${row.id}`,
                toastFn: toast.info,
              });
            } else if (row.status === "pending") {
              notify({
                title: "New job request",
                url: "/barber",
                tag: `booking-${row.id}`,
                toastFn: toast.info,
              });
            }
            setHasNewJob(true);
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
            const row = payload.new as { id: string; status: string; decline_reason: string | null };
            if (row.status === "pending") setHasNewJob(true);
            if (row.status === "cancelled") {
              notify({
                title: "A customer cancelled their booking.",
                url: "/barber",
                tag: `booking-${row.id}`,
                toastFn: toast.info,
              });
            }
            if (row.status === "declined" && row.decline_reason === "timeout") {
              notify({
                title: "A request expired before you answered it.",
                url: "/barber",
                tag: `booking-${row.id}`,
                toastFn: toast.info,
              });
            }
            router.refresh();
          },
        )
        .on(
          "postgres_changes",
          // Unfiltered: booking_messages' own RLS already scopes select
          // to this booking's customer/barber/admin.
          { event: "INSERT", schema: "public", table: "booking_messages" },
          async (payload) => {
            const row = payload.new as { booking_id: string; sender_id: string; body: string };
            if (row.sender_id === barberId || cancelled) return;
            const senderName = await resolveName(row.sender_id, "Your customer");
            if (cancelled) return;
            notify({
              title: `New message from ${senderName}`,
              body: row.body,
              url: "/barber",
              tag: `chat-${row.booking_id}`,
              toastFn: toast.info,
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "token_ledger", filter: `barber_id=eq.${barberId}` },
          (payload) => {
            const row = payload.new as { type: string; token_amount: number };
            if (row.type !== "adjustment" || row.token_amount >= 0) return;
            notify({
              title: `₱${Math.abs(row.token_amount)} commission drawn from your wallet`,
              url: "/barber/earnings",
              toastFn: toast.info,
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "barber_profiles", filter: `id=eq.${barberId}` },
          (payload) => {
            const row = payload.new as { token_balance: number };
            const balance = Number(row.token_balance);
            const wasAbove = (lastBalanceRef.current ?? balance) >= minWalletRef.current;
            if (wasAbove && balance < minWalletRef.current) {
              notify({
                title: "Wallet low — top up to stay online",
                url: "/barber/earnings",
                tag: "wallet-low",
                toastFn: toast.warning,
              });
            }
            lastBalanceRef.current = balance;
          },
        )
        .on(
          "postgres_changes",
          // Unfiltered: disputes_select already scopes to the raiser, the
          // booking's barber, and admins.
          { event: "UPDATE", schema: "public", table: "disputes" },
          (payload) => {
            const row = payload.new as { status: string };
            if (row.status !== "resolved" && row.status !== "dismissed") return;
            notify({
              title: "A dispute involving you was resolved",
              url: "/barber/history",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId]);

  return (
    <JobsBadgeContext.Provider value={hasNewJob}>
      {children}
    </JobsBadgeContext.Provider>
  );
}

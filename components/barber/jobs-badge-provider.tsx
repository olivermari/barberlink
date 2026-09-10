"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

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

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
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
            const status = (payload.new as { status: string }).status;
            toast.info(
              status === "queued"
                ? "A new booking joined your queue."
                : "New booking request!",
            );
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
            const status = (payload.new as { status: string }).status;
            if (status === "pending") {
              toast.info("You're up — a queued booking is now pending.");
              setHasNewJob(true);
            }
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

  return (
    <JobsBadgeContext.Provider value={hasNewJob}>
      {children}
    </JobsBadgeContext.Provider>
  );
}

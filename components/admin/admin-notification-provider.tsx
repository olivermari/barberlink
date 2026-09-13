"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notifications";

// Mounted once in app/admin/layout.tsx so an admin browsing any /admin/*
// page hears about new disputes and verification submissions, not just
// while sitting on the exact list. barber_profiles is public-read, so
// this filters client-side rather than relying on RLS to narrow it.
export function AdminNotificationProvider() {
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
        .channel("admin-alerts")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "disputes" },
          (payload) => {
            const row = payload.new as { id: string };
            notify({
              title: "New dispute filed",
              url: "/admin/disputes",
              tag: `dispute-${row.id}`,
              toastFn: toast.info,
            });
          },
        )
        .on(
          "postgres_changes",
          // "pending" covers both a first-time signup and a barber
          // resubmitting after "needs_info" — that second transition is
          // the barber's own action, not the admin's, so it's still new
          // work for the queue. "needs_info" itself is set BY an admin
          // (Request more info), so it's deliberately not included here.
          { event: "*", schema: "public", table: "barber_profiles" },
          (payload) => {
            const row = payload.new as { id: string; verification_status: string };
            if (row.verification_status !== "pending") return;
            notify({
              title: "New barber verification submitted",
              url: "/admin/barbers",
              tag: `verify-${row.id}`,
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
  }, []);

  return null;
}

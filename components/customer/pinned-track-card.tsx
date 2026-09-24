"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { distanceKm } from "@/lib/distance";
import { Photo } from "@/components/customer/ui";

const ACTIVE = ["queued", "pending", "accepted", "on_the_way", "in_service"];

const STATUS_TEXT: Record<string, string> = {
  queued: "in the queue",
  pending: "waiting to accept",
  accepted: "accepted",
  on_the_way: "on the way",
  in_service: "cutting now",
};

type Active = {
  status: string;
  barberName: string;
  avatarUrl: string | null;
  service: string;
  etaMin: number | null;
};

// "An active booking sits pinned at the foot of the right panel so Track
// is never more than one click away" — desktop Book only.
export function PinnedTrackCard() {
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: b } = await supabase
        .from("bookings")
        .select("status, barber_id, service_id, address_lat, address_lng")
        .in("status", ACTIVE)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!b || cancelled) return setActive(null);
      const [{ data: profile }, { data: bp }, { data: svc }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", b.barber_id).single(),
        supabase.from("barber_profiles").select("current_lat, current_lng").eq("id", b.barber_id).single(),
        b.service_id
          ? supabase.from("services").select("name").eq("id", b.service_id).single()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      let etaMin: number | null = null;
      if (b.status === "on_the_way" && bp?.current_lat != null && bp?.current_lng != null) {
        const km = distanceKm(
          { lat: bp.current_lat, lng: bp.current_lng },
          { lat: b.address_lat, lng: b.address_lng },
        );
        etaMin = Math.max(1, Math.round(((km * 1.3) / 20) * 60));
      }
      setActive({
        status: b.status,
        barberName: profile?.full_name ?? "Your barber",
        avatarUrl: profile?.avatar_url ?? null,
        service: svc?.name ?? "Booking",
        etaMin,
      });
    }
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!active) return null;

  return (
    <Link
      href="/customer/track"
      className="mt-auto flex items-center gap-[11px] rounded-xl border border-wash-border bg-wash px-[15px] py-[13px] transition-colors hover:bg-[#f0ece2]"
    >
      <Photo src={active.avatarUrl} name={active.barberName} className="size-[38px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-bold">
          {active.barberName} · {STATUS_TEXT[active.status] ?? active.status}
        </span>
        <span className="text-[13px] text-[#6a635a]">
          {active.service}
          {active.etaMin != null && ` · ETA ${active.etaMin} min`}
        </span>
      </span>
      <span className="text-[13px] font-bold text-primary">Track</span>
    </Link>
  );
}

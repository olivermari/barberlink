"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BookableService = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

export type Barber = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  ratingAvg: number;
  ratingCount: number;
  // Active services, cheapest first.
  services: BookableService[];
  photos: string[];
  isAvailable: boolean;
  isBusy: boolean;
  queuedCount: number;
};

// Every verified barber with a known position — offline ones included,
// because the design lists them dimmed and unbookable rather than hiding
// them. Refreshes when the tab regains focus, so "Busy · 2 in queue"
// doesn't go stale while the customer is deciding.
export function useBarbers() {
  const [barbers, setBarbers] = useState<Barber[] | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: rows } = await supabase
      .from("barber_profiles")
      .select("id, bio, current_lat, current_lng, service_radius_km, rating_avg, rating_count, is_available")
      .eq("verification_status", "verified");

    const located = (rows ?? []).filter((r) => r.current_lat != null && r.current_lng != null);
    const ids = located.map((r) => r.id);
    if (ids.length === 0) {
      setBarbers([]);
      return;
    }

    const [{ data: profiles }, { data: dispatch }, { data: services }, { data: photos }] =
      await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
        supabase.rpc("barbers_dispatch_status", { target_barber_ids: ids }),
        supabase
          .from("services")
          .select("id, barber_id, name, price, duration_minutes")
          .in("barber_id", ids)
          .eq("is_active", true)
          .order("price", { ascending: true }),
        supabase
          .from("barber_portfolio")
          .select("barber_id, image_url")
          .in("barber_id", ids)
          .order("created_at", { ascending: false }),
      ]);

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const dispatchById = new Map(
      ((dispatch ?? []) as { barber_id: string; is_busy: boolean; queued_count: number }[]).map(
        (d) => [d.barber_id, d],
      ),
    );
    const servicesById = new Map<string, BookableService[]>();
    for (const s of services ?? []) {
      const list = servicesById.get(s.barber_id) ?? [];
      list.push({ id: s.id, name: s.name, price: s.price, duration_minutes: s.duration_minutes });
      servicesById.set(s.barber_id, list);
    }
    const photosById = new Map<string, string[]>();
    for (const p of photos ?? []) {
      const list = photosById.get(p.barber_id) ?? [];
      list.push(p.image_url);
      photosById.set(p.barber_id, list);
    }

    setBarbers(
      located.map((r) => {
        const profile = profileById.get(r.id);
        const d = dispatchById.get(r.id);
        return {
          id: r.id,
          name: profile?.full_name ?? "Barber",
          avatarUrl: profile?.avatar_url ?? null,
          bio: r.bio,
          lat: r.current_lat as number,
          lng: r.current_lng as number,
          serviceRadiusKm: r.service_radius_km ?? 5,
          ratingAvg: Number(r.rating_avg ?? 0),
          ratingCount: r.rating_count ?? 0,
          services: servicesById.get(r.id) ?? [],
          photos: (photosById.get(r.id) ?? []).slice(0, 3),
          isAvailable: r.is_available,
          isBusy: d?.is_busy ?? false,
          queuedCount: d?.queued_count ?? 0,
        };
      }),
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return { barbers, reload: load };
}

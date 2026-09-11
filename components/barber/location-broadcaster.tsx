"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { distanceKm } from "@/lib/distance";

const MIN_INTERVAL_MS = 20_000;
const MIN_MOVE_KM = 0.05;
// Below this the barber is standing still; only refresh occasionally.
const STILL_KM = 0.005;
const STILL_INTERVAL_MS = 120_000;

// While a barber is online, keeps barber_profiles.current_lat/lng live —
// it feeds Quick Match, queue promotion and the customer's tracking map.
// Writes at most every 20 s, or sooner after moving 50 m.
export function LocationBroadcaster({
  barberId,
  isAvailable,
}: {
  barberId: string;
  isAvailable: boolean;
}) {
  const last = useRef<{ at: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isAvailable || !("geolocation" in navigator)) return;
    const supabase = createClient();

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const now = Date.now();
        const prev = last.current;

        if (prev) {
          const moved = distanceKm(prev, here);
          const elapsed = now - prev.at;
          if (moved < MIN_MOVE_KM && elapsed < MIN_INTERVAL_MS) return;
          if (moved < STILL_KM && elapsed < STILL_INTERVAL_MS) return;
        }

        last.current = { at: now, ...here };
        await supabase
          .from("barber_profiles")
          .update({ current_lat: here.lat, current_lng: here.lng })
          .eq("id", barberId);
      },
      // Going online already required a fix; a later GPS hiccup just
      // pauses updates until the next reading.
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [barberId, isAvailable]);

  return null;
}

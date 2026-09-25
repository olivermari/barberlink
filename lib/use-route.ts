"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { distanceKm } from "@/lib/distance";
import { fetchRoute, trimRoute, type LatLng, type Route } from "@/lib/route";

export type RouteView = {
  // Barber's position first, then the road, ending at the customer's
  // exact pin (OSRM snaps to the nearest road, so that last hop is added).
  points: [number, number][];
  remainingKm: number;
  etaMin: number;
};

// Refetch when the barber leaves the drawn road (took another street),
// or has moved well along it and a minute has passed — otherwise the
// cached route is just trimmed. Keeps the public OSRM server at roughly
// a request a minute per trip.
const OFF_ROUTE_KM = 0.1;
const PROGRESS_KM = 0.15;
const REFRESH_MS = 60_000;
const MIN_GAP_MS = 15_000;

// Road-following route and ETA from the barber to the customer. Null
// while loading, when disabled, or if OSRM fails — callers fall back to
// the straight line and the rough ETA.
export function useRoute(from: LatLng | null, to: LatLng | null, enabled: boolean): RouteView | null {
  const [base, setBase] = useState<{ route: Route; origin: LatLng; to: LatLng } | null>(null);
  const lastAttemptRef = useRef(0);
  // A result is kept as long as it's the newest request and the hook is
  // still mounted — not tied to the effect run that started it, since a
  // re-run (or React's dev double-invoke) would otherwise discard it while
  // the rate limit blocks the retry.
  const latestRequestRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fLat = from?.lat;
  const fLng = from?.lng;
  const tLat = to?.lat;
  const tLng = to?.lng;

  useEffect(() => {
    if (!enabled || fLat == null || fLng == null || tLat == null || tLng == null) return;
    const origin = { lat: fLat, lng: fLng };
    const dest = { lat: tLat, lng: tLng };

    const now = Date.now();
    const sameDest = base != null && distanceKm(base.to, dest) < 0.01;
    const offRoute = base != null && trimRoute(base.route.points, origin).offRouteKm > OFF_ROUTE_KM;
    const progressed =
      base != null &&
      distanceKm(base.origin, origin) > PROGRESS_KM &&
      now - lastAttemptRef.current > REFRESH_MS;

    if (sameDest && !offRoute && !progressed) return;
    if (now - lastAttemptRef.current < MIN_GAP_MS) return;
    lastAttemptRef.current = now;

    const requestId = ++latestRequestRef.current;
    fetchRoute(origin, dest).then((route) => {
      if (route && mountedRef.current && requestId === latestRequestRef.current) {
        setBase({ route, origin, to: dest });
      }
    });
  }, [enabled, fLat, fLng, tLat, tLng, base]);

  return useMemo(() => {
    if (!enabled || !base || fLat == null || fLng == null || tLat == null || tLng == null) return null;
    // A route to a different spot (the pin moved) is stale until refetched.
    if (distanceKm(base.to, { lat: tLat, lng: tLng }) >= 0.01) return null;

    const trimmed = trimRoute(base.route.points, { lat: fLat, lng: fLng });
    const share = base.route.distanceKm > 0 ? trimmed.remainingKm / base.route.distanceKm : 0;
    return {
      points: [...trimmed.points, [tLat, tLng]],
      remainingKm: trimmed.remainingKm,
      etaMin: Math.max(1, Math.round(base.route.durationMin * Math.min(1, share))),
    };
  }, [enabled, base, fLat, fLng, tLat, tLng]);
}

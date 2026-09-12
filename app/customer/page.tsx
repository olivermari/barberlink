"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/use-geolocation";
import { useCuttingLocation } from "@/lib/location-store";
import { distanceKm } from "@/lib/distance";
import { useMatchRadius } from "@/lib/use-match-radius";
import { Button } from "@/components/ui/button";
import { LocationBar } from "@/components/customer/location-bar";
import {
  BarberCard,
  BarberRailItem,
  type NearbyBarber,
} from "@/components/customer/barber-card";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { BookingDialog, type BookableService } from "@/components/booking-dialog";

const BarberMap = dynamic(
  () => import("@/components/map/barber-map").then((m) => m.BarberMap),
  { ssr: false },
);

type LoadedBarber = Omit<NearbyBarber, "distanceKm">;
type BookingTarget = { barber: LoadedBarber; directPick: boolean };

export default function CustomerHomePage() {
  return (
    <Suspense>
      <CustomerHome />
    </Suspense>
  );
}

// Wireframes C1 (mobile), C2 (barber sheet) and C7 (web): map-first,
// with the two dispatch paths one tap apart and the +₱50 stated before
// the tap.
function CustomerHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stored = useCuttingLocation();
  const { coords: gps, status } = useGeolocation();
  const coords = stored ?? gps;
  const matchRadiusKm = useMatchRadius();

  const [barbers, setBarbers] = useState<LoadedBarber[] | null>(null);
  const [matching, setMatching] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [target, setTarget] = useState<BookingTarget | null>(null);

  // `?match=1` (from "Quick Match instead" / "Quick Match again") runs a
  // Quick Match as soon as barbers load; `?exclude=` skips barbers who
  // just declined or didn't answer.
  const autoMatchRef = useRef(searchParams.get("match") === "1");
  const excludeRef = useRef(
    new Set((searchParams.get("exclude") ?? "").split(",").filter(Boolean)),
  );
  const coordsRef = useRef(coords);
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  async function quickMatch(list: LoadedBarber[] | null = barbers) {
    const from = coordsRef.current;
    const candidates = (list ?? [])
      .map((b) => ({ ...b, distanceKm: distanceKm(from, b) }))
      .filter(
        (b) =>
          b.services.length > 0 &&
          !excludeRef.current.has(b.id) &&
          b.distanceKm <= Math.min(matchRadiusKm, b.serviceRadiusKm),
      )
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (candidates.length === 0) {
      toast.error("No barbers are online near you right now.");
      return;
    }

    setMatching(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("barbers_dispatch_status", {
      target_barber_ids: candidates.map((c) => c.id),
    });
    setMatching(false);

    if (error) {
      toast.error("Couldn't check who's free. Try again.");
      return;
    }

    const busy = new Set(
      ((data ?? []) as { barber_id: string; is_busy: boolean }[])
        .filter((r) => r.is_busy)
        .map((r) => r.barber_id),
    );
    const free = candidates.find((c) => !busy.has(c.id));

    if (!free) {
      toast.error(
        `No one's free right now — choose a barber to join their queue (+₱${CHOSEN_BARBER_SURCHARGE}).`,
      );
      setSheetOpen(true);
      return;
    }

    setTarget({ barber: free, directPick: false });
  }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: rows } = await supabase
        .from("barber_profiles")
        .select(
          "id, bio, current_lat, current_lng, service_radius_km, rating_avg, rating_count",
        )
        .eq("verification_status", "verified")
        .eq("is_available", true);

      const located = (rows ?? []).filter(
        (r) => r.current_lat != null && r.current_lng != null,
      );
      const ids = located.map((r) => r.id);

      if (ids.length === 0) {
        if (!cancelled) setBarbers([]);
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

      const list: LoadedBarber[] = located.map((r) => {
        const profile = profileById.get(r.id);
        const d = dispatchById.get(r.id);
        const barberPhotos = photosById.get(r.id) ?? [];
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
          photos: barberPhotos.slice(0, 3),
          photoCount: barberPhotos.length,
          isBusy: d?.is_busy ?? false,
          queuedCount: d?.queued_count ?? 0,
        };
      });

      if (cancelled) return;
      setBarbers(list);

      if (autoMatchRef.current) {
        autoMatchRef.current = false;
        router.replace("/customer");
        await quickMatch(list);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // Loads once on mount; quickMatch/router are stable enough for the
    // single auto-match this effect can trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nearby: NearbyBarber[] = useMemo(
    () =>
      (barbers ?? [])
        .map((b) => ({ ...b, distanceKm: distanceKm(coords, b) }))
        .filter((b) => b.distanceKm <= Math.min(matchRadiusKm, b.serviceRadiusKm))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [barbers, coords, matchRadiusKm],
  );

  const expandedId = selectedId ?? nearby[0]?.id ?? null;
  const countLabel =
    barbers === null
      ? "Finding barbers near you…"
      : `${nearby.length} barber${nearby.length === 1 ? "" : "s"} within ${matchRadiusKm} km`;
  const fallbackLabel =
    status === "granted"
      ? "your current location"
      : status === "locating"
        ? "finding your location…"
        : "Manila (location is off)";

  function chooseBarber(barber: LoadedBarber) {
    setSheetOpen(false);
    setTarget({ barber, directPick: true });
  }

  const quickMatchLabel = matching ? "Finding your barber…" : "Quick Match — nearest free barber";
  const emptyList =
    barbers === null ? (
      <p className="text-sm text-muted-foreground">Finding barbers near you…</p>
    ) : nearby.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        No barbers are online near you right now. Try again in a bit, or move your pin.
      </p>
    ) : null;

  return (
    <div className="flex flex-1 flex-col sm:grid sm:min-h-0 sm:grid-cols-[400px_minmax(0,1fr)]">
      {/* Web left rail (C7) */}
      <aside className="hidden min-h-0 flex-col gap-3.5 overflow-y-auto border-r-[1.5px] border-outline p-5 sm:flex">
        <LocationBar fallback={gps} fallbackLabel={fallbackLabel} className="border-[1.5px]" />
        <Button size="lg" className="h-14 text-lg" onClick={() => quickMatch()} disabled={matching}>
          {quickMatchLabel}
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[13px] text-faint">
            or choose one · +₱{CHOSEN_BARBER_SURCHARGE}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="flex flex-col gap-2.5">
          {emptyList ??
            nearby.map((b) => (
              <BarberRailItem key={b.id} barber={b} onBook={() => chooseBarber(b)} />
            ))}
        </div>
      </aside>

      {/* Map (C1 full-bleed on mobile; fills the rest on web) */}
      <div className="relative isolate min-h-[60svh] flex-1 max-sm:[&_.leaflet-control-zoom]:hidden sm:min-h-0">
        <div className="absolute inset-0 z-0">
          <BarberMap
            center={[coords.lat, coords.lng]}
            barbers={nearby.map((b) => ({
              id: b.id,
              fullName: b.name,
              distanceKm: b.distanceKm,
              lat: b.lat,
              lng: b.lng,
            }))}
          />
        </div>

        <div className="absolute inset-x-3.5 top-3.5 z-10 sm:hidden">
          <LocationBar fallback={gps} fallbackLabel={fallbackLabel} />
        </div>

        <div className="absolute inset-x-3.5 bottom-3.5 z-10 flex flex-col gap-2.5 sm:hidden">
          <Button size="lg" className="h-14 text-lg" onClick={() => quickMatch()} disabled={matching}>
            {quickMatchLabel}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 bg-background text-[15px]"
            onClick={() => setSheetOpen(true)}
          >
            Choose your barber · +₱{CHOSEN_BARBER_SURCHARGE}
          </Button>
        </div>

        <div className="absolute top-4 right-4 z-10 hidden rounded-md border-[1.5px] border-outline bg-background px-3.5 py-2.5 text-sm font-semibold sm:block">
          {countLabel}
        </div>
      </div>

      {/* Mobile barber sheet (C2) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col sm:hidden">
          <button
            type="button"
            aria-label="Close barber list"
            className="flex-1 bg-black/35"
            onClick={() => setSheetOpen(false)}
          />
          <div className="flex max-h-[78svh] flex-col gap-3.5 overflow-y-auto rounded-t-[14px] border-t-[1.5px] border-outline bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="h-1 w-11 self-center rounded-full bg-input" />
            <p className="text-[15px] font-semibold text-muted-foreground">{countLabel}</p>
            {emptyList ??
              nearby.map((b) => (
                <BarberCard
                  key={b.id}
                  barber={b}
                  expanded={b.id === expandedId}
                  onSelect={() => setSelectedId(b.id)}
                  onBook={() => chooseBarber(b)}
                />
              ))}
          </div>
        </div>
      )}

      {target && (
        <BookingDialog
          key={`${target.barber.id}-${target.directPick}`}
          open
          onOpenChange={(open) => {
            if (!open) setTarget(null);
          }}
          barber={{ id: target.barber.id, name: target.barber.name }}
          services={target.barber.services}
          directPick={target.directPick}
        />
      )}
    </div>
  );
}

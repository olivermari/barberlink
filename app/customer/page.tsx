"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/use-geolocation";
import { distanceKm, MAX_MATCH_RADIUS_KM } from "@/lib/distance";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const BarberMap = dynamic(
  () => import("@/components/map/barber-map").then((m) => m.BarberMap),
  { ssr: false },
);

type Barber = {
  id: string;
  fullName: string;
  bio: string | null;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  ratingAvg: number;
  ratingCount: number;
};

export default function CustomerHome() {
  const router = useRouter();
  const { coords, status } = useGeolocation();
  const [barbers, setBarbers] = useState<Barber[] | null>(null);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: rows, error } = await supabase
        .from("barber_profiles")
        .select(
          "id, bio, current_lat, current_lng, service_radius_km, rating_avg, rating_count",
        )
        .eq("verification_status", "verified")
        .eq("is_available", true);

      if (error || !rows) {
        setBarbers([]);
        return;
      }

      const ids = rows.map((r) => r.id);
      const { data: nameRows } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null }[] };

      const nameById = new Map((nameRows ?? []).map((r) => [r.id, r.full_name]));

      setBarbers(
        rows
          .filter((r) => r.current_lat != null && r.current_lng != null)
          .map((r) => ({
            id: r.id,
            fullName: nameById.get(r.id) ?? "Barber",
            bio: r.bio,
            lat: r.current_lat as number,
            lng: r.current_lng as number,
            serviceRadiusKm: r.service_radius_km ?? 5,
            ratingAvg: r.rating_avg ?? 0,
            ratingCount: r.rating_count ?? 0,
          })),
      );
    }

    load();
  }, []);

  const nearby = useMemo(() => {
    if (!barbers) return [];
    return barbers
      .map((b) => ({
        ...b,
        distanceKm: distanceKm(coords, { lat: b.lat, lng: b.lng }),
      }))
      .filter((b) => b.distanceKm <= Math.min(MAX_MATCH_RADIUS_KM, b.serviceRadiusKm))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [barbers, coords]);

  async function handleQuickMatch() {
    if (nearby.length === 0) {
      toast.error("No barbers available right now.");
      return;
    }

    setMatching(true);
    const supabase = createClient();
    const { data: busyRows, error } = await supabase.rpc("barbers_busy_status", {
      target_barber_ids: nearby.map((b) => b.id),
    });
    setMatching(false);

    if (error) {
      toast.error("Couldn't check barber availability. Try again.");
      return;
    }

    const busyList = (busyRows ?? []) as {
      barber_id: string;
      is_busy: boolean;
    }[];
    const busyIds = new Set(
      busyList.filter((r) => r.is_busy).map((r) => r.barber_id),
    );
    const free = nearby.find((b) => !busyIds.has(b.id));

    if (!free) {
      toast.error(
        "No barbers available right now — pick one below to join their queue.",
      );
      return;
    }

    router.push(`/customer/barbers/${free.id}?quick=1`);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Browse barbers</h1>
          <p className="text-sm text-muted-foreground">
            {status === "locating" && "Finding your location..."}
            {status === "denied" &&
              "Location access denied — showing barbers near Manila."}
            {status === "unsupported" &&
              "Location isn't available here — showing barbers near Manila."}
            {status === "granted" &&
              barbers !== null &&
              `${nearby.length} barber${nearby.length === 1 ? "" : "s"} near you`}
          </p>
        </div>
        <Button onClick={handleQuickMatch} disabled={matching}>
          {matching ? "Matching..." : "Quick Match"}
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <div className="flex flex-col gap-3 lg:max-h-[70vh] lg:overflow-y-auto">
          {barbers === null && (
            <p className="text-sm text-muted-foreground">Loading barbers...</p>
          )}
          {barbers !== null && nearby.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No available barbers in your area yet.
            </p>
          )}
          {nearby.map((b) => (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {b.fullName}
                  <Badge variant="secondary">{b.distanceKm.toFixed(1)} km</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {b.bio ?? "No bio yet."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {b.ratingCount > 0
                    ? `★ ${b.ratingAvg.toFixed(1)} (${b.ratingCount})`
                    : "No ratings yet"}
                </p>
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/customer/barbers/${b.id}`} />}
                >
                  View profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="min-h-[320px] overflow-hidden rounded-lg border">
          <BarberMap
            center={[coords.lat, coords.lng]}
            barbers={nearby.map((b) => ({
              id: b.id,
              fullName: b.fullName,
              distanceKm: b.distanceKm,
              lat: b.lat,
              lng: b.lng,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

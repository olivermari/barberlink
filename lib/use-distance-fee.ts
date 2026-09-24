"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_DISTANCE_FEE_PER_KM, DEFAULT_DISTANCE_FREE_KM } from "@/lib/pricing";

// The distance-fee numbers from platform_settings (0028), starting from
// the code defaults until they load.
export function useDistanceFee() {
  const [fee, setFee] = useState({
    freeKm: DEFAULT_DISTANCE_FREE_KM,
    perKm: DEFAULT_DISTANCE_FEE_PER_KM,
  });

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("platform_settings")
      .select("key, value")
      .in("key", ["distance_free_km", "distance_fee_per_km"])
      .then(({ data }) => {
        if (cancelled || !data) return;
        const byKey = new Map(data.map((r) => [r.key as string, Number(r.value)]));
        const freeKm = byKey.get("distance_free_km");
        const perKm = byKey.get("distance_fee_per_km");
        setFee((current) => ({
          freeKm: freeKm != null && freeKm >= 0 ? freeKm : current.freeKm,
          perKm: perKm != null && perKm >= 0 ? perKm : current.perKm,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return fee;
}

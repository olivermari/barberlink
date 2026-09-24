"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_MATCH_RADIUS_KM } from "@/lib/distance";

// The Quick Match / nearby-barber ceiling from platform_settings (0020),
// starting from the code default until it loads.
export function useMatchRadius() {
  const [km, setKm] = useState(MAX_MATCH_RADIUS_KM);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("platform_settings")
      .select("value")
      .eq("key", "max_match_radius_km")
      .maybeSingle()
      .then(({ data }) => {
        const value = Number(data?.value);
        if (!cancelled && value > 0) setKm(value);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return km;
}

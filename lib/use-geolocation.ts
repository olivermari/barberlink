"use client";

import { useEffect, useState } from "react";

// Lipa City — the market this app serves — used whenever we don't have
// a real fix yet. Same point admin/coverage defaults to.
const DEFAULT_CENTER = { lat: 13.9411, lng: 121.1631 };

export type GeolocationStatus = "locating" | "granted" | "denied" | "unsupported";

function isSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function useGeolocation() {
  const [coords, setCoords] = useState(DEFAULT_CENTER);
  const [status, setStatus] = useState<GeolocationStatus>(() =>
    isSupported() ? "locating" : "unsupported",
  );

  useEffect(() => {
    if (status === "unsupported") return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { timeout: 8000 },
    );
    // only ever needs to run once — re-running on `status` changes
    // (granted/denied) would just re-request the same fix again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, status };
}

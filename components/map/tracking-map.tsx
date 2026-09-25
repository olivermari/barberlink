"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useAnimatedMarker } from "@/lib/use-animated-marker";
import type { RouteView } from "@/lib/use-route";
import { BARBER_ICON, YOU_ICON, barberVehicleIcon } from "./markers";

// Keeps both pins in view on first frame, then only re-frames later if
// the barber's marker would actually leave the current view — holding
// the camera still otherwise is what stops the whole map from jerking
// on every ~20s position update; only the marker itself should move.
function Frame({
  cLat,
  cLng,
  bLat,
  bLng,
}: {
  cLat: number;
  cLng: number;
  bLat: number | null;
  bLng: number | null;
}) {
  const map = useMap();
  const framedOnce = useRef(false);

  useEffect(() => {
    if (bLat == null || bLng == null) {
      if (!framedOnce.current) {
        map.setView([cLat, cLng], 15);
        framedOnce.current = true;
      }
      return;
    }

    const bounds = L.latLngBounds([
      [cLat, cLng],
      [bLat, bLng],
    ]);

    if (!framedOnce.current) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: false });
      framedOnce.current = true;
      return;
    }

    if (!map.getBounds().pad(-0.1).contains([bLat, bLng])) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: true, duration: 0.8 });
    }
  }, [map, cLat, cLng, bLat, bLng]);

  return null;
}

const ROUTE_STYLE = { color: "#3b6fd8", weight: 4, opacity: 0.9, lineCap: "round" as const };

export function TrackingMap({
  customer,
  barber,
  route,
}: {
  customer: { lat: number; lng: number };
  barber: { lat: number; lng: number } | null;
  // Road-following route from lib/use-route.ts; null falls back to a
  // straight line (OSRM loading or unavailable).
  route?: RouteView | null;
}) {
  // Glides toward each new position instead of snapping, and rotates to
  // face the direction of travel — see lib/use-animated-marker.ts.
  // Lifted to this level so the route line starts at the gliding pin
  // rather than at the latest ping the pin hasn't reached yet.
  const { position, heading } = useAnimatedMarker(barber);
  // Rounded so react-leaflet isn't asked to rebuild the icon every
  // animation frame — see barberVehicleIcon's own comment. Plain pin
  // until there's a second fix to compute a heading from.
  const icon = heading != null ? barberVehicleIcon(Math.round(heading / 5) * 5) : BARBER_ICON;
  const line: [number, number][] | null = position
    ? route
      ? [[position.lat, position.lng], ...route.points.slice(1)]
      : [
          [position.lat, position.lng],
          [customer.lat, customer.lng],
        ]
    : null;

  return (
    <MapContainer
      center={[customer.lat, customer.lng]}
      zoom={15}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        className="b2g-tiles"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Frame
        cLat={customer.lat}
        cLng={customer.lng}
        bLat={barber?.lat ?? null}
        bLng={barber?.lng ?? null}
      />
      {line && <Polyline positions={line} pathOptions={ROUTE_STYLE} />}
      <Marker position={[customer.lat, customer.lng]} icon={YOU_ICON} />
      {position && <Marker position={[position.lat, position.lng]} icon={icon} />}
    </MapContainer>
  );
}

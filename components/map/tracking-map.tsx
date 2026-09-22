"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useAnimatedMarker } from "@/lib/use-animated-marker";
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

// Glides toward each new position instead of snapping, and rotates to
// face the direction of travel — see lib/use-animated-marker.ts. Falls
// back to the plain stationary pin until there's a second fix to
// compute a heading from.
function AnimatedBarberMarker({ target }: { target: { lat: number; lng: number } }) {
  const { position, heading } = useAnimatedMarker(target);
  if (!position) return null;
  // Rounded so react-leaflet isn't asked to rebuild the icon every
  // animation frame — see barberVehicleIcon's own comment.
  const icon = heading != null ? barberVehicleIcon(Math.round(heading / 5) * 5) : BARBER_ICON;
  return <Marker position={[position.lat, position.lng]} icon={icon} />;
}

export function TrackingMap({
  customer,
  barber,
}: {
  customer: { lat: number; lng: number };
  barber: { lat: number; lng: number } | null;
}) {
  return (
    <MapContainer
      center={[customer.lat, customer.lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Frame
        cLat={customer.lat}
        cLng={customer.lng}
        bLat={barber?.lat ?? null}
        bLng={barber?.lng ?? null}
      />
      <Marker position={[customer.lat, customer.lng]} icon={YOU_ICON} />
      {barber && <AnimatedBarberMarker target={barber} />}
    </MapContainer>
  );
}

"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { BARBER_ICON, YOU_ICON } from "@/components/map/markers";

type Point = { lat: number; lng: number };

function Frame({
  aLat,
  aLng,
  bLat,
  bLng,
}: {
  aLat: number;
  aLng: number;
  bLat: number | null;
  bLng: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (bLat != null && bLng != null) {
      map.fitBounds(
        L.latLngBounds([
          [aLat, aLng],
          [bLat, bLng],
        ]),
        // No animation: this map sits in a lg:hidden container and the
        // layout re-renders on every router.refresh() (JobsBadgeProvider),
        // so a pending pan animation can still be stepping when the
        // container is hidden/torn down — Leaflet then calls
        // getComputedStyle on a detached node and throws.
        { padding: [40, 40], maxZoom: 16, animate: false },
      );
    } else {
      map.setView([aLat, aLng], 15, { animate: false });
    }
  }, [map, aLat, aLng, bLat, bLng]);
  return null;
}

// The barber's view: their own position (ink pin) and the customer's
// spot (red dot) — the same markers the customer sees. Fills its
// container.
export function JobMap({ customer, barber }: { customer: Point | null; barber: Point | null }) {
  const anchor = customer ?? barber;
  if (!anchor) return null;
  const other = customer && barber ? barber : null;

  return (
    <MapContainer
      center={[anchor.lat, anchor.lng]}
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
        aLat={anchor.lat}
        aLng={anchor.lng}
        bLat={other?.lat ?? null}
        bLng={other?.lng ?? null}
      />
      {customer && <Marker position={[customer.lat, customer.lng]} icon={YOU_ICON} />}
      {barber && <Marker position={[barber.lat, barber.lng]} icon={BARBER_ICON} />}
    </MapContainer>
  );
}

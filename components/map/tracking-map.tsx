"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { BARBER_ICON, YOU_ICON } from "./markers";

// Keeps both the customer's pin and the barber's live position in view,
// re-framing whenever the barber moves.
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
  useEffect(() => {
    if (bLat != null && bLng != null) {
      map.fitBounds(
        L.latLngBounds([
          [cLat, cLng],
          [bLat, bLng],
        ]),
        { padding: [48, 48], maxZoom: 16 },
      );
    } else {
      map.setView([cLat, cLng], 15);
    }
  }, [map, cLat, cLng, bLat, bLng]);
  return null;
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
      {barber && <Marker position={[barber.lat, barber.lng]} icon={BARBER_ICON} />}
    </MapContainer>
  );
}

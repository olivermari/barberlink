"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Default marker images don't resolve correctly once bundled — point
// them at the CDN copies instead of wiring up asset imports.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Barbers get the brand mark; the customer's own position keeps the
// default Leaflet pin, so the two are never confused. Uses the
// simplified cut — at marker size the full scissors close up.
const BARBER_ICON = L.divIcon({
  className: "",
  html: `<svg viewBox="0 0 100 100" width="34" height="34" style="filter: drop-shadow(0 2px 3px rgba(22,19,15,.4))">
      <path fill="#16130f" d="M50 4C72.1 4 90 21.9 90 44c0 24.3-29.4 47.9-40 52C39.4 91.9 10 68.3 10 44 10 21.9 27.9 4 50 4Z"/>
      <g fill="none" stroke="#f2eee4" stroke-width="11" stroke-linecap="round">
        <path d="M38 31 L62 61"/><path d="M62 31 L38 61"/>
      </g>
    </svg>`,
  iconSize: [34, 34],
  // Anchored on the pin's point (50,96 of a 100 box), not its centre.
  iconAnchor: [17, 33],
  popupAnchor: [0, -30],
});

export type MapBarber = {
  id: string;
  fullName: string;
  distanceKm: number;
  lat: number;
  lng: number;
};

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export function BarberMap({
  center,
  barbers,
}: {
  center: [number, number];
  barbers: MapBarber[];
}) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      <Marker position={center}>
        <Popup>You are here</Popup>
      </Marker>
      {barbers.map((b) => (
        <Marker key={b.id} position={[b.lat, b.lng]} icon={BARBER_ICON}>
          <Popup>
            <div className="font-medium">{b.fullName}</div>
            <div className="text-xs">{b.distanceKm.toFixed(1)} km away</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

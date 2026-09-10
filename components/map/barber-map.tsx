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

// Marker language from the wireframes: barbers are ink pins and the
// customer's own position is a red dot — the only red on the map, so
// "where am I" never gets confused with "who's near me".
const BARBER_ICON = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#16130f;box-shadow:0 2px 4px rgba(22,19,15,.35)"></div>`,
  iconSize: [26, 26],
  // Rotating the square puts its sharp corner 18.4px below centre —
  // anchor on that point, not on the box.
  iconAnchor: [13, 31],
  popupAnchor: [0, -28],
});

const YOU_ICON = L.divIcon({
  className: "",
  html: `<div style="box-sizing:border-box;width:20px;height:20px;border-radius:50%;background:#cf2417;border:3px solid #fff;box-shadow:0 1px 4px rgba(22,19,15,.4)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
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
      <Marker position={center} icon={YOU_ICON}>
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

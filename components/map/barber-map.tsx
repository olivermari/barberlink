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
        <Marker key={b.id} position={[b.lat, b.lng]}>
          <Popup>
            <div className="font-medium">{b.fullName}</div>
            <div className="text-xs">{b.distanceKm.toFixed(1)} km away</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { BARBER_ICON, YOU_ICON } from "./markers";

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
      zoom={14}
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

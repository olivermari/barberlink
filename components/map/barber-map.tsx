"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { barberPinIcon, YOU_ICON } from "./markers";

export type MapBarber = {
  id: string;
  fullName: string;
  distanceKm: number;
  lat: number;
  lng: number;
  avatarUrl?: string | null;
};

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

// Wireframe map: the tiles are warmed toward the design's cream ground
// (see .b2g-tiles in globals.css) so pins and the red position dot stay
// the loudest things on it.
export function BarberMap({
  center,
  barbers,
  onSelectBarber,
}: {
  center: [number, number];
  barbers: MapBarber[];
  // Tapping a pin opens that barber the same way tapping their card
  // does — a popup with a name was a dead end otherwise.
  onSelectBarber?: (id: string) => void;
}) {
  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        className="b2g-tiles"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      <Marker position={center} icon={YOU_ICON} zIndexOffset={1000}>
        <Popup>You are here</Popup>
      </Marker>
      {barbers.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lng]}
          icon={barberPinIcon(b.avatarUrl)}
          eventHandlers={onSelectBarber ? { click: () => onSelectBarber(b.id) } : undefined}
        >
          <Popup>
            <div className="font-semibold">{b.fullName}</div>
            <div className="text-xs">{b.distanceKm.toFixed(1)} km away</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { SPOT_ICON } from "./markers";

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function ClickToPlace({ onChange }: { onChange: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// The pin-your-spot map. `interactive={false}` makes it the small
// read-only thumbnail on Booking Confirmation ("View on map" opens the
// interactive one).
export function LocationPicker({
  position,
  onChange,
  interactive = true,
}: {
  position: { lat: number; lng: number };
  onChange?: (coords: { lat: number; lng: number }) => void;
  interactive?: boolean;
}) {
  const center: [number, number] = [position.lat, position.lng];

  return (
    <MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      zoomControl={false}
      attributionControl={interactive}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        className="b2g-tiles"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {interactive && onChange && <ClickToPlace onChange={onChange} />}
      <Marker
        position={center}
        icon={SPOT_ICON}
        draggable={interactive}
        eventHandlers={{
          dragend: (e) => {
            const latlng = e.target.getLatLng();
            onChange?.({ lat: latlng.lat, lng: latlng.lng });
          },
        }}
      />
    </MapContainer>
  );
}

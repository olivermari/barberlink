"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { BARBER_ICON } from "@/components/map/markers";

type Point = { lat: number; lng: number };

function Fit({ center, km }: { center: Point; km: number }) {
  const map = useMap();
  useEffect(() => {
    // Bounds by hand: a Circle only knows its bounds once it is on a map,
    // and this map can be mounted in a hidden (zero-size) container.
    const dLat = km / 111.32;
    const dLng = km / (111.32 * Math.cos((center.lat * Math.PI) / 180));
    const bounds = L.latLngBounds(
      [center.lat - dLat, center.lng - dLng],
      [center.lat + dLat, center.lng + dLng],
    );
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;
    map.fitBounds(bounds, { padding: [14, 14], animate: false });
  }, [map, center.lat, center.lng, km]);
  return null;
}

// Where you cut and how far you'll travel for a job: your pin and the
// service-radius circle around it.
export function RadiusMap({ center, km }: { center: Point; km: number }) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        className="b2g-tiles"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[center.lat, center.lng]}
        radius={km * 1000}
        pathOptions={{ color: "#cf2417", weight: 2, fillColor: "#cf2417", fillOpacity: 0.1 }}
      />
      <Marker position={[center.lat, center.lng]} icon={BARBER_ICON} />
      <Fit center={center} km={km} />
    </MapContainer>
  );
}

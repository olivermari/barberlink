"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

type Point = { lat: number; lng: number };

const LIPA_CITY: Point = { lat: 13.9411, lng: 121.1631 };

function Frame({ points }: { points: Point[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(
        L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [32, 32], maxZoom: 15 },
      );
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

// Supply and demand (A1): online barbers as ink dots, requests as red
// halos — darker where nobody answered in time.
export function OpsMap({
  barbers,
  requests,
}: {
  barbers: Point[];
  requests: (Point & { expired: boolean })[];
}) {
  const points = [...barbers, ...requests];
  const center = points[0] ?? LIPA_CITY;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Frame points={points} />
      {requests.map((r, i) => (
        <CircleMarker
          key={`request-${i}`}
          center={[r.lat, r.lng]}
          radius={r.expired ? 13 : 10}
          pathOptions={{
            stroke: false,
            fillColor: "#cf2417",
            fillOpacity: r.expired ? 0.4 : 0.18,
          }}
        />
      ))}
      {barbers.map((b, i) => (
        <CircleMarker
          key={`barber-${i}`}
          center={[b.lat, b.lng]}
          radius={6}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#16130f", fillOpacity: 1 }}
        />
      ))}
    </MapContainer>
  );
}

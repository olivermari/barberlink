"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { NavigationIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Default marker images don't resolve correctly once bundled — point
// them at the CDN copies instead of wiring up asset imports.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, { padding: [24, 24] });
    } else {
      map.setView(points[0], 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(points)]);
  return null;
}

export function JobMap({
  customerLat,
  customerLng,
  customerLabel,
  barberLat,
  barberLng,
}: {
  customerLat: number;
  customerLng: number;
  customerLabel: string;
  barberLat?: number | null;
  barberLng?: number | null;
}) {
  const hasBarberLocation = barberLat != null && barberLng != null;
  const points: [number, number][] = hasBarberLocation
    ? [
        [barberLat as number, barberLng as number],
        [customerLat, customerLng],
      ]
    : [[customerLat, customerLng]];

  return (
    <div className="flex flex-col gap-2">
      <div className="h-48 w-full overflow-hidden rounded-lg border">
        <MapContainer
          center={points[0]}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          <Marker position={[customerLat, customerLng]}>
            <Popup>{customerLabel}</Popup>
          </Marker>
          {hasBarberLocation && (
            <Marker position={[barberLat as number, barberLng as number]}>
              <Popup>You</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${customerLat},${customerLng}`}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        <NavigationIcon />
        Navigate
      </Button>
    </div>
  );
}

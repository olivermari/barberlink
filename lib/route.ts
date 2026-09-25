import { distanceKm } from "@/lib/distance";

export type LatLng = { lat: number; lng: number };

export type Route = {
  // [lat, lng] pairs along the road, barber end first.
  points: [number, number][];
  distanceKm: number;
  durationMin: number;
};

// OSRM's free public server: no key, CORS-open, but no uptime guarantee
// and light use only — callers must fall back gracefully on null.
// Driving (car) is the only profile it serves.
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

// ~10 m rounding, so the same trip drawn twice (phone and desktop
// layouts, or a re-mount) shares one request.
const keyOf = (p: LatLng) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
const cache = new Map<string, Promise<Route | null>>();

export function fetchRoute(from: LatLng, to: LatLng): Promise<Route | null> {
  const key = `${keyOf(from)}|${keyOf(to)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const request = fetch(
    `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
  )
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      const route = json?.code === "Ok" ? json.routes?.[0] : null;
      if (!route) return null;
      return {
        points: (route.geometry.coordinates as [number, number][]).map(
          ([lng, lat]) => [lat, lng] as [number, number],
        ),
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
      };
    })
    .catch(() => null);

  cache.set(key, request);
  // A failure shouldn't stick — let the next attempt retry.
  request.then((route) => {
    if (!route) cache.delete(key);
  });
  if (cache.size > 50) cache.delete(cache.keys().next().value!);
  return request;
}

// Flat projection in km around `origin` — accurate enough for the few-km
// distances a barber trip covers.
function toXY(p: LatLng, origin: LatLng) {
  const kmPerLng = 111.32 * Math.cos((origin.lat * Math.PI) / 180);
  return { x: (p.lng - origin.lng) * kmPerLng, y: (p.lat - origin.lat) * 110.574 };
}

// Cuts off the part of the route already driven: finds the road segment
// nearest the barber, and returns the line from the barber onward plus
// how far they are from the route (to detect a different road taken).
export function trimRoute(points: [number, number][], pos: LatLng) {
  let best = { index: 0, offKm: Infinity };
  const p = toXY(pos, pos);

  for (let i = 0; i < points.length - 1; i++) {
    const a = toXY({ lat: points[i][0], lng: points[i][1] }, pos);
    const b = toXY({ lat: points[i + 1][0], lng: points[i + 1][1] }, pos);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const offKm = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
    if (offKm < best.offKm) best = { index: i, offKm };
  }

  const rest = points.slice(best.index + 1);
  const trimmed: [number, number][] = [[pos.lat, pos.lng], ...rest];
  let remainingKm = 0;
  for (let i = 0; i < trimmed.length - 1; i++) {
    remainingKm += distanceKm(
      { lat: trimmed[i][0], lng: trimmed[i][1] },
      { lat: trimmed[i + 1][0], lng: trimmed[i + 1][1] },
    );
  }
  return { points: trimmed, remainingKm, offRouteKm: best.offKm };
}

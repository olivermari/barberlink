import { distanceKm } from "@/lib/distance";
import type { Barber } from "@/lib/use-barbers";

export type NearBarber = Barber & { distanceKm: number };

// Barbers with their distance from `from`, nearest first, limited to those
// close enough to count as "near": inside the platform's match radius and
// the barber's own service radius.
export function nearbyBarbers(
  barbers: Barber[],
  from: { lat: number; lng: number },
  matchRadiusKm: number,
): NearBarber[] {
  return barbers
    .map((b) => ({ ...b, distanceKm: distanceKm(from, b) }))
    .filter((b) => b.distanceKm <= Math.min(matchRadiusKm, b.serviceRadiusKm))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function canBook(b: Barber) {
  return b.isAvailable && b.services.length > 0;
}

// The design's Quick Match copy: "Find the nearest available barber. If
// everyone's busy, we'll put you in a queue." — so the nearest FREE
// barber wins, and when nobody is free the nearest of the shortest queues
// does (booking a busy barber queues automatically; see 0007).
export function pickQuickMatch(near: NearBarber[], excluded: Set<string> = new Set()) {
  const open = near.filter((b) => canBook(b) && !excluded.has(b.id));
  const free = open.find((b) => !b.isBusy);
  if (free) return free;
  return [...open].sort(
    (a, b) => a.queuedCount - b.queuedCount || a.distanceKm - b.distanceKm,
  )[0];
}

// "0.8 km · Available now" / "1.2 km · Busy right now" / "2.1 km ·
// booking disabled" — the second line of a barber card.
export function availabilityLine(b: NearBarber) {
  const state = !b.isAvailable
    ? "booking disabled"
    : b.isBusy
      ? "Busy right now"
      : "Available now";
  return `${b.distanceKm.toFixed(1)} km · ${state}`;
}

// "Available" / "Busy · 2 in queue" / "Offline" chip.
export function availabilityChip(
  b: Pick<Barber, "isAvailable" | "isBusy" | "queuedCount">,
): { label: string; tone: "ok" | "bad" | "quiet" } {
  if (!b.isAvailable) return { label: "Offline", tone: "quiet" };
  if (b.isBusy) {
    return { label: b.queuedCount > 0 ? `Busy · ${b.queuedCount} in queue` : "Busy", tone: "bad" };
  }
  return { label: "Available", tone: "ok" };
}

export const cheapestService = (b: Barber) => b.services[0];

// Short tags for a barber card from the fixed service catalog.
export function serviceTag(name: string) {
  return name.replace(/^Regular /, "").replace(" Shave", "");
}

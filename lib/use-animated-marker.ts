"use client";

import { useEffect, useState } from "react";
import { distanceKm } from "@/lib/distance";

type Point = { lat: number; lng: number };

// Matches location-broadcaster.tsx's ~20s update cadence, so the marker
// is always gliding toward the latest ping rather than snapping then
// sitting still.
const GLIDE_MS = 15_000;
// A real move at street speed can't cover this between two 20s pings —
// catches a GPS glitch or a stale/first fix, where animating across the
// jump would look worse than just snapping.
const SNAP_THRESHOLD_KM = 1.5;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

// Great-circle initial bearing from `from` to `to`, in degrees.
function bearing(from: Point, to: Point) {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function targetKeyOf(target: Point | null) {
  return target ? `${target.lat},${target.lng}` : null;
}

// Eases a marker's displayed position toward `target` instead of
// snapping to it — for a live-tracked position that only updates every
// ~20s (see location-broadcaster.tsx), snapping reads as a teleporting
// dot; gliding reads as a moving vehicle. Also returns the bearing
// between the last two points, for rotating a directional icon.
export function useAnimatedMarker(target: Point | null) {
  const [position, setPosition] = useState(target);
  const [heading, setHeading] = useState<number | null>(null);
  // Tracks which target we've already reacted to, so the block below
  // only fires once per actual change — same "compare during render,
  // adjust once" shape as jobs-badge-provider.tsx's pathname reset.
  // Deliberately state, not a ref: refs can't be read during render.
  const [lastTargetKey, setLastTargetKey] = useState(targetKeyOf(target));

  const targetKey = targetKeyOf(target);
  if (targetKey !== lastTargetKey) {
    setLastTargetKey(targetKey);
    // Immediate (no-animation) cases: target cleared, no prior fix to
    // glide from, or too big a jump to be a real move — snap. A normal
    // move leaves `position` as its previous value; the effect below
    // animates it from there.
    if (!target) {
      setPosition(null);
    } else if (!position || distanceKm(position, target) > SNAP_THRESHOLD_KM) {
      setPosition(target);
    }
  }

  useEffect(() => {
    if (!target || !position) return;
    if (position.lat === target.lat && position.lng === target.lng) return;
    if (distanceKm(position, target) > SNAP_THRESHOLD_KM) return; // already snapped above

    const from = position;
    // The bearing is constant for this leg of the animation — computed
    // inside the callback (not synchronously in the effect body) so it
    // stays a "subscribe, then setState in a callback" pattern; React
    // bails out of re-rendering once it's set to the same number.
    const legHeading = bearing(from, target);
    const start = performance.now();
    let rafId: number;

    function tick(now: number) {
      setHeading(legHeading);
      const t = Math.min(1, (now - start) / GLIDE_MS);
      const eased = easeOutCubic(t);
      setPosition({
        lat: lerp(from.lat, target!.lat, eased),
        lng: lerp(from.lng, target!.lng, eased),
      });
      if (t < 1) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
    // Only the coordinates matter, not object identity, and `position`
    // is intentionally excluded — it's read once as this run's
    // animation start point, not a trigger to restart on every frame
    // this same effect is the one updating it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng]);

  return { position, heading };
}

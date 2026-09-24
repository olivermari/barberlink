"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LocateFixedIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { getCurrentPosition, LocationRequiredError } from "@/lib/get-current-position";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { formatPeso } from "@/lib/format";
import { AvailabilityToggle } from "@/components/barber/availability-toggle";
import { RadiusMap } from "@/components/barber/radius-map-lazy";
import { Caption } from "@/components/customer/ui";

const MIN_KM = 1;
const MAX_KM = 10;

// The "Availability & radius" section: whether you're taking jobs (and why
// you can't be), how far you'll travel, and the spot that radius is drawn
// around. The slider saves when you let go.
export function AvailabilitySection({
  barberId,
  isAvailable,
  verified,
  balance,
  minWallet,
  radiusKm,
  maxMatchKm,
  baseAddress,
  position,
  id,
}: {
  barberId: string;
  isAvailable: boolean;
  verified: boolean;
  balance: number;
  minWallet: number;
  radiusKm: number | null;
  maxMatchKm: number;
  baseAddress: string | null;
  position: { lat: number; lng: number } | null;
  id?: string;
}) {
  const router = useRouter();
  const initial = Math.min(MAX_KM, Math.max(MIN_KM, radiusKm ?? 5));
  const [radius, setRadius] = useState(initial);
  const [saved, setSaved] = useState(radiusKm != null ? initial : null);
  const [locating, setLocating] = useState(false);
  const fill = ((radius - MIN_KM) / (MAX_KM - MIN_KM)) * 100;

  async function commit() {
    if (radius === saved) return;
    const { error } = await createClient()
      .from("barber_profiles")
      .update({ service_radius_km: radius })
      .eq("id", barberId);
    if (error) {
      toast.error(friendlyError(error, "Couldn't save your radius. Try again."));
      return;
    }
    setSaved(radius);
    toast.success(`Service radius set to ${radius} km.`);
    router.refresh();
  }

  async function useHere() {
    setLocating(true);
    let coords: { lat: number; lng: number };
    try {
      coords = await getCurrentPosition();
    } catch (err) {
      setLocating(false);
      toast.error(err instanceof LocationRequiredError ? err.message : "Couldn't get your location.");
      return;
    }
    const address = await reverseGeocode(coords.lat, coords.lng);
    const { error } = await createClient()
      .from("barber_profiles")
      .update({
        current_lat: coords.lat,
        current_lng: coords.lng,
        ...(address ? { base_address: address } : {}),
      })
      .eq("id", barberId);
    setLocating(false);
    if (error) {
      toast.error(friendlyError(error, "Couldn't save your location. Try again."));
      return;
    }
    toast.success("Location updated.");
    router.refresh();
  }

  const lockedReason = !verified
    ? "You can go online once an admin verifies you."
    : balance < minWallet
      ? `Top up to at least ${formatPeso(minWallet)} to go online — your wallet is ${formatPeso(balance)}.`
      : null;

  return (
    <section
      id={id}
      className="flex scroll-mt-4 flex-col gap-3.5 rounded-[14px] border border-line bg-white p-3.5"
    >
      <Caption>Availability</Caption>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">Receive jobs</span>
          <span className="text-[12.5px] text-faint">
            {lockedReason ?? (isAvailable ? "Customers near you can book you" : "You won't get requests")}
          </span>
        </div>
        {verified && <AvailabilityToggle barberId={barberId} isAvailable={isAvailable} />}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-[#f1ebdf] pt-3.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14.5px] font-semibold">Service radius</span>
            <span className="text-[12.5px] text-faint">How far you&apos;ll travel</span>
          </div>
          <span className="text-lg font-extrabold">{radius} km</span>
        </div>
        <input
          type="range"
          min={MIN_KM}
          max={MAX_KM}
          step={0.5}
          value={radius}
          aria-label="Service radius in kilometres"
          onChange={(e) => setRadius(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-[3px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
          style={{
            background: `linear-gradient(to right, var(--primary) ${fill}%, #f1ebdf ${fill}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-faint">
          <span>{MIN_KM} km</span>
          <span>{MAX_KM} km</span>
        </div>
        {radius > maxMatchKm && (
          <p className="rounded-[10px] border border-wash-border bg-wash p-2.5 text-[12.5px] leading-[1.45] text-[#4c463d]">
            Matching is capped at {maxMatchKm} km platform-wide, so jobs past that distance won&apos;t reach
            you even with a wider radius.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-[#f1ebdf] pt-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">Where you cut from</span>
          <span className="text-[12.5px] text-faint">{baseAddress ?? "No base address yet"}</span>
        </div>
        {position && (
          <div className="isolate h-[150px] overflow-hidden rounded-xl border border-line bg-photo">
            <RadiusMap center={position} km={radius} />
          </div>
        )}
        <button
          type="button"
          onClick={useHere}
          disabled={locating}
          className="flex items-center justify-center gap-2 rounded-[10px] border border-foreground p-[11px] text-[13.5px] font-bold transition-colors hover:bg-wash disabled:opacity-60"
        >
          <LocateFixedIcon className="size-4" aria-hidden />
          {locating ? "Finding you…" : "Use my current location"}
        </button>
      </div>
    </section>
  );
}

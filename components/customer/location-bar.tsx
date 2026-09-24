"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { LocateFixedIcon } from "lucide-react";
import { getCurrentPosition, LocationRequiredError } from "@/lib/get-current-position";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { setCuttingLocation, useCuttingLocation } from "@/lib/location-store";
import { cn } from "@/lib/utils";
import { LocationPicker } from "@/components/map/location-picker-lazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const noopSubscribe = () => () => {};

// Wireframe C1/C7 "Cutting at — your pin · Change". The location it sets
// is what Quick Match and the booking sheet start from.
export function LocationBar({
  fallback,
  fallbackLabel,
  className,
}: {
  fallback: { lat: number; lng: number };
  fallbackLabel: string;
  className?: string;
}) {
  const stored = useCuttingLocation();
  // Location only exists in the browser; render a neutral placeholder on
  // the server pass so hydration matches.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const label = isClient ? (stored?.label ?? fallbackLabel) : "…";
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-full border border-field bg-white px-3.5 py-2 text-[13px] shadow-[0_4px_14px_rgba(22,19,15,0.07)]",
          className,
        )}
      >
        <span className="min-w-0 truncate text-muted-foreground">
          Cutting at — <span className="text-foreground">{label}</span>
        </span>
        <DialogTrigger className="-m-2.5 shrink-0 p-2.5 font-semibold text-primary outline-none focus-visible:underline">
          Change
        </DialogTrigger>
      </div>
      <DialogContent className="flex flex-col gap-4 rounded-[14px] border border-line p-5 ring-0 sm:max-w-md">
        <LocationEditor
          initial={stored ?? { ...fallback, label: null }}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function LocationEditor({
  initial,
  onDone,
}: {
  initial: { lat: number; lng: number; label: string | null };
  onDone: () => void;
}) {
  const [pos, setPos] = useState({ lat: initial.lat, lng: initial.lng });
  const [label, setLabel] = useState(initial.label ?? "");
  const [locating, setLocating] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  async function place(next: { lat: number; lng: number }) {
    setPos(next);
    const name = await reverseGeocode(next.lat, next.lng);
    if (name) setLabel(name);
  }

  async function useGps() {
    setLocating(true);
    try {
      await place(await getCurrentPosition());
      setMapKey((k) => k + 1);
    } catch (err) {
      toast.error(
        err instanceof LocationRequiredError
          ? "Turn on location access, or drop the pin yourself."
          : "Couldn't get your location. Try again.",
      );
    } finally {
      setLocating(false);
    }
  }

  function save() {
    setCuttingLocation({ lat: pos.lat, lng: pos.lng, label: label.trim() || null });
    onDone();
  }

  return (
    <>
      <DialogTitle className="text-xl font-black">Where should we cut?</DialogTitle>
      <DialogDescription>
        Drop the pin where the barber should come — we match barbers to this spot.
      </DialogDescription>
      <Input
        aria-label="Address"
        className="h-12 rounded-[11px] border border-field px-3.5"
        placeholder="Street, barangay, city"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Button type="button" variant="outline" onClick={useGps} disabled={locating}>
        <LocateFixedIcon />
        {locating ? "Locating…" : "Use my location"}
      </Button>
      <div className="isolate h-56 overflow-hidden rounded-md border border-input">
        <LocationPicker key={mapKey} position={pos} onChange={place} />
      </div>
      <Button size="lg" className="h-12" onClick={save}>
        Cut here
      </Button>
    </>
  );
}

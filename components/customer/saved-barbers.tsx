"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeartIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { distanceKm } from "@/lib/distance";
import { useCuttingLocation } from "@/lib/location-store";
import { useGeolocation } from "@/lib/use-geolocation";
import { availabilityChip } from "@/lib/barber-match";
import { Photo, StatusPill } from "@/components/customer/ui";
import { cn } from "@/lib/utils";

export type SavedBarber = {
  id: string;
  name: string;
  avatarUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  lat: number | null;
  lng: number | null;
  isAvailable: boolean;
  isBusy: boolean;
  queuedCount: number;
};

// "Saved barbers" in the profile rail: rating, how far they are from where
// you're cutting, and whether they're free right now.
export function SavedBarbers({ barbers }: { barbers: SavedBarber[] }) {
  const stored = useCuttingLocation();
  const { coords: gps } = useGeolocation();
  const from = stored ?? gps;

  if (barbers.length === 0) {
    return (
      <p className="text-[13px] leading-[1.45] text-[#6a635a]">
        Tap the heart on a barber&apos;s profile to keep them here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {barbers.map((b) => {
        const chip = availabilityChip(b);
        const km = b.lat != null && b.lng != null ? distanceKm(from, { lat: b.lat, lng: b.lng }) : null;
        return (
          <li key={b.id}>
            <Link
              href={`/customer/barbers/${b.id}`}
              className="flex items-center gap-[11px] rounded-xl border border-line p-3 transition-colors hover:bg-wash"
            >
              <Photo src={b.avatarUrl} name={b.name} square className="size-10 rounded-[10px]" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-bold">{b.name}</span>
                <span className="text-[12.5px] text-[#6a635a]">
                  {b.ratingCount > 0 ? `★ ${b.ratingAvg.toFixed(1)}` : "New"}
                  {km != null && ` · ${km.toFixed(1)} km`}
                </span>
              </span>
              <StatusPill tone={chip.tone}>{b.isAvailable && b.isBusy ? "Busy" : chip.label}</StatusPill>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// The heart on a barber's profile.
export function SaveBarberButton({
  barberId,
  initialSaved,
  className,
}: {
  barberId: string;
  initialSaved: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }
    const { error } = saved
      ? await supabase.from("saved_barbers").delete().eq("customer_id", user.id).eq("barber_id", barberId)
      : await supabase.from("saved_barbers").insert({ customer_id: user.id, barber_id: barberId });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error, "Couldn't update your saved barbers."));
      return;
    }
    setSaved(!saved);
    toast.success(saved ? "Removed from saved barbers." : "Saved.");
    router.refresh();
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved barbers" : "Save this barber"}
      disabled={busy}
      onClick={toggle}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-field transition-colors hover:bg-wash disabled:opacity-60",
        className,
      )}
    >
      <HeartIcon className={cn("size-5", saved && "fill-primary text-primary")} aria-hidden />
    </button>
  );
}

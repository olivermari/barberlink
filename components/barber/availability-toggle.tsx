"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition, LocationRequiredError } from "@/lib/get-current-position";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Shared by the header pill and the B1 "Go online" card. Both follow
// the server value after router.refresh(), so they can't disagree for
// long.
function useAvailability(barberId: string, serverValue: boolean) {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(serverValue);
  const [seen, setSeen] = useState(serverValue);
  const [loading, setLoading] = useState(false);

  if (serverValue !== seen) {
    setSeen(serverValue);
    setIsAvailable(serverValue);
  }

  async function setOnline(next: boolean) {
    const supabase = createClient();
    setLoading(true);

    if (next) {
      // A negative balance means the barber owes the platform
      // commission from cash jobs — checked fresh, not from stale
      // page-load state, since it can change between visits.
      const { data: profile } = await supabase
        .from("barber_profiles")
        .select("token_balance")
        .eq("id", barberId)
        .single();

      if ((profile?.token_balance ?? 0) < 0) {
        setLoading(false);
        toast.error(
          `You owe ₱${Math.abs(profile?.token_balance ?? 0)} in commission from cash jobs — top up on the Earnings page to go online again.`,
        );
        return;
      }

      // Going online requires a fresh, real GPS fix — customers rely on
      // this position to see the barber as nearby, so a stale or
      // permission-denied location must block going online rather than
      // silently defaulting anywhere.
      let coords: { lat: number; lng: number };
      try {
        coords = await getCurrentPosition();
      } catch (err) {
        setLoading(false);
        toast.error(
          err instanceof LocationRequiredError
            ? err.message
            : "Couldn't get your location. Try again.",
        );
        return;
      }

      const { error } = await supabase
        .from("barber_profiles")
        .update({ is_available: true, current_lat: coords.lat, current_lng: coords.lng })
        .eq("id", barberId);

      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setIsAvailable(true);
      toast.success("You're online.");
      router.refresh();
      return;
    }

    const { error } = await supabase
      .from("barber_profiles")
      .update({ is_available: false })
      .eq("id", barberId);

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setIsAvailable(false);
    toast.success("You're offline.");
    router.refresh();
  }

  return { isAvailable, loading, setOnline };
}

// The ONLINE / OFFLINE pill from B1 and B6.
export function AvailabilityToggle({
  barberId,
  isAvailable: serverValue,
  className,
}: {
  barberId: string;
  isAvailable: boolean;
  className?: string;
}) {
  const { isAvailable, loading, setOnline } = useAvailability(barberId, serverValue);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isAvailable}
      aria-label="Receive jobs"
      onClick={() => setOnline(!isAvailable)}
      disabled={loading}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border-[1.5px] py-1 pr-1 pl-3 text-[13px] font-bold tracking-wide transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
        isAvailable ? "border-primary text-primary" : "border-outline text-muted-foreground",
        className,
      )}
    >
      {isAvailable ? "ONLINE" : "OFFLINE"}
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-10 items-center rounded-full p-0.5 transition-colors",
          isAvailable ? "justify-end bg-primary" : "justify-start bg-border",
        )}
      >
        <span
          className={cn("size-5 rounded-full", isAvailable ? "bg-primary-foreground" : "bg-faint")}
        />
      </span>
    </button>
  );
}

export function GoOnlineButton({
  barberId,
  isAvailable,
}: {
  barberId: string;
  isAvailable: boolean;
}) {
  const { loading, setOnline } = useAvailability(barberId, isAvailable);

  return (
    <Button size="lg" className="h-12 text-base" onClick={() => setOnline(true)} disabled={loading}>
      {loading ? "Getting your location…" : "Go online"}
    </Button>
  );
}

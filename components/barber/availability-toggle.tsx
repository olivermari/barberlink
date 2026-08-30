"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition, LocationRequiredError } from "@/lib/get-current-position";
import { Button } from "@/components/ui/button";

export function AvailabilityToggle({
  barberId,
  initialIsAvailable,
  verified,
}: {
  barberId: string;
  initialIsAvailable: boolean;
  verified: boolean;
}) {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(initialIsAvailable);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !isAvailable;
    const supabase = createClient();

    if (next) {
      setLoading(true);

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

    setLoading(true);
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

  if (!verified) {
    return (
      <Button size="sm" disabled variant="outline">
        Verification pending
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant={isAvailable ? "default" : "outline"}
      onClick={toggle}
      disabled={loading}
    >
      {loading ? "Updating..." : isAvailable ? "Online — go offline" : "Go online"}
    </Button>
  );
}

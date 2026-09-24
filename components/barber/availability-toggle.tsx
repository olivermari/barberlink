"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition, LocationRequiredError } from "@/lib/get-current-position";
import { friendlyError } from "@/lib/friendly-error";
import {
  ensurePushSubscription,
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/notifications";
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
      // The database enforces the same minimum (0020); checking here
      // first gives a clearer message than the raised error.
      const [{ data: profile }, { data: minSetting }] = await Promise.all([
        supabase.from("barber_profiles").select("token_balance").eq("id", barberId).single(),
        supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "min_wallet_to_go_online")
          .maybeSingle(),
      ]);
      const balance = Number(profile?.token_balance ?? 0);
      const minWallet = Number(minSetting?.value ?? 0) || 0;

      if (balance < minWallet) {
        setLoading(false);
        toast.error(
          balance < 0
            ? `You owe ₱${Math.abs(balance)} in commission from cash jobs — top up on the Earnings page to go online again.`
            : `Your wallet needs at least ₱${minWallet} to go online — top up on the Earnings page.`,
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
        toast.error(friendlyError(error, "Couldn't go online. Try again."));
        return;
      }
      setIsAvailable(true);
      toast.success("You're online.");
      // Asked here, not on first visit: this is the moment a missed
      // request notification would actually cost the barber a job, so
      // it's the one place the ask has real context behind it.
      if (notificationPermission() === "default") {
        requestNotificationPermission().then((permission) => {
          if (permission === "granted") ensurePushSubscription();
        });
      }
      router.refresh();
      return;
    }

    const { error } = await supabase
      .from("barber_profiles")
      .update({ is_available: false })
      .eq("id", barberId);

    setLoading(false);
    if (error) {
      toast.error(friendlyError(error, "Couldn't go offline. Try again."));
      return;
    }
    setIsAvailable(false);
    toast.success("You're offline.");
    router.refresh();
  }

  return { isAvailable, loading, setOnline };
}

// The design's ONLINE / OFFLINE pill: the most consequential control in the
// app, so it is a full pill with its own label and track. `dark` is the
// phone's ink band; `size="lg"` is the phone's larger track.
export function AvailabilityToggle({
  barberId,
  isAvailable: serverValue,
  dark,
  className,
}: {
  barberId: string;
  isAvailable: boolean;
  dark?: boolean;
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
        "flex shrink-0 items-center gap-[9px] rounded-[20px] border py-[5px] pr-2 pl-[13px] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
        isAvailable ? "border-primary" : dark ? "border-[#4c463d]" : "border-line-strong",
        className,
      )}
    >
      <span
        className={cn(
          "text-[12.5px] font-bold",
          isAvailable ? (dark ? "text-[#e8402f]" : "text-primary") : "text-[#a49c90]",
        )}
      >
        {isAvailable ? "ONLINE" : "OFFLINE"}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex h-[22px] w-[38px] items-center rounded-[11px] p-0.5 transition-colors max-lg:h-6 max-lg:w-10 max-lg:rounded-xl",
          isAvailable ? "justify-end bg-primary" : dark ? "justify-start bg-[#3a342c]" : "justify-start bg-[#d8d2c5]",
        )}
      >
        <span
          className={cn(
            "size-[18px] rounded-full max-lg:size-5",
            isAvailable ? "bg-white" : dark ? "bg-[#8a8277]" : "bg-white",
          )}
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
    <Button className="h-auto rounded-[11px] p-[15px] text-base font-bold" onClick={() => setOnline(true)} disabled={loading}>
      {loading ? "Getting your location…" : "Go online"}
    </Button>
  );
}

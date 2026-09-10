"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LocateFixedIcon, MapPinIcon, XIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/use-geolocation";
import { getCurrentPosition, LocationRequiredError } from "@/lib/get-current-position";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { setCuttingLocation, useCuttingLocation } from "@/lib/location-store";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { LocationPicker } from "@/components/map/location-picker-lazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type BookableService = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

// Cash and GCash only — GCash is the one online method wired to
// PayMongo (PR #1), so it's the only one offered.
const PAYMENT_METHODS = [
  { value: "cod", label: "Cash" },
  { value: "gcash", label: "GCash" },
] as const;

const ONLINE_METHODS = new Set(["gcash"]);

// Wireframe C3: one sheet, no steps — service, address, payment and the
// ₱50 line item all resolve before the single commit button. A bottom
// sheet on phones, a dialog on wider screens.
export function BookingDialog({
  barber,
  services,
  initialServiceId,
  directPick,
  open,
  onOpenChange,
  triggerLabel,
}: {
  barber: { id: string; name: string };
  services: BookableService[];
  initialServiceId?: string;
  directPick: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Uncontrolled use: renders its own "Book"-style trigger button.
  triggerLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerLabel && (
        <DialogTrigger render={<Button size="sm" />}>{triggerLabel}</DialogTrigger>
      )}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92svh] flex-col gap-4 overflow-y-auto rounded-lg border-[1.5px] border-outline p-4 ring-0 sm:max-w-md max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-[14px] max-sm:border-x-0 max-sm:border-b-0"
      >
        {/* Mounted only while open, so the geolocation request and the
            map don't run for every closed dialog on a page. */}
        <BookingForm
          barber={barber}
          services={services}
          initialServiceId={initialServiceId}
          directPick={directPick}
          onDone={() => onOpenChange?.(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function BookingForm({
  barber,
  services,
  initialServiceId,
  directPick,
  onDone,
}: {
  barber: { id: string; name: string };
  services: BookableService[];
  initialServiceId?: string;
  directPick: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const stored = useCuttingLocation();
  const { coords: gps } = useGeolocation();
  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id);
  const [pickingService, setPickingService] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const coords = pin ?? stored ?? gps;
  const addressValue = address ?? stored?.label ?? "";

  if (!service) {
    return (
      <div className="flex flex-col gap-3">
        <DialogTitle className="text-xl font-black">Nothing to book yet</DialogTitle>
        <DialogDescription>{barber.name} hasn&apos;t listed any services.</DialogDescription>
      </div>
    );
  }

  const total = directPick ? service.price + CHOSEN_BARBER_SURCHARGE : service.price;

  async function applyLocation(next: { lat: number; lng: number }) {
    setPin(next);
    const label = await reverseGeocode(next.lat, next.lng);
    if (label) setAddress(label);
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      const fresh = await getCurrentPosition();
      await applyLocation(fresh);
      setMapKey((k) => k + 1);
    } catch (err) {
      toast.error(
        err instanceof LocationRequiredError
          ? "Turn on location access to use your current spot, or type your address."
          : "Couldn't get your location. Try again.",
      );
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addressValue.trim()) {
      setError("Add the address where the barber should come.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("You need to be logged in to book.");
      return;
    }

    const { data: feeSetting } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "fee_percentage")
      .single();

    const feePercent = Number(feeSetting?.value ?? 10);
    // The commission applies to the whole charge, chosen-barber
    // surcharge included — not just the service price.
    const platformFee = Math.round(total * feePercent) / 100;
    const barberPayout = Math.round((total - platformFee) * 100) / 100;

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        barber_id: barber.id,
        service_id: service.id,
        address_text: addressValue.trim(),
        address_lat: coords.lat,
        address_lng: coords.lng,
        price: total,
        platform_fee: platformFee,
        barber_payout: barberPayout,
        payment_method: paymentMethod,
      })
      .select("id, status")
      .single();

    if (insertError || !booking) {
      setLoading(false);
      setError(insertError?.message ?? "Something went wrong.");
      return;
    }

    // Remember this spot so the next booking starts from it.
    setCuttingLocation({ lat: coords.lat, lng: coords.lng, label: addressValue.trim() });

    if (ONLINE_METHODS.has(paymentMethod)) {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const payment = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(payment.error ?? "Payment couldn't be started.");
        return;
      }

      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
        return;
      }
    }

    setLoading(false);
    onDone();
    toast.success(
      booking.status === "queued"
        ? `You're in ${barber.name}'s queue.`
        : "Request sent!",
    );
    router.push(`/customer/bookings/${booking.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <DialogTitle className="text-[21px] font-black">Confirm booking</DialogTitle>
        <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" />}>
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>
      <DialogDescription className="sr-only">
        Confirm the service, where the barber should come, and how you&apos;ll pay.
      </DialogDescription>

      <div className="rounded-lg border-[1.5px] border-outline p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-base font-semibold">{service.name}</span>
            <span className="text-sm text-muted-foreground">
              {service.duration_minutes} min · with {barber.name}
            </span>
          </div>
          {services.length > 1 && (
            <button
              type="button"
              onClick={() => setPickingService((v) => !v)}
              className="shrink-0 text-sm font-semibold text-primary"
            >
              {pickingService ? "Done" : "Change"}
            </button>
          )}
        </div>
        {pickingService && (
          <div className="mt-3 flex flex-col gap-1 border-t pt-2.5">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setPickingService(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm",
                  s.id === service.id ? "bg-accent font-semibold" : "hover:bg-muted",
                )}
              >
                <span>
                  {s.name} · {s.duration_minutes} min
                </span>
                <span>₱{s.price}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Where</SectionLabel>
        <Input
          aria-label="Address"
          className="h-12 border-[1.5px] border-outline text-[15px]"
          placeholder="Street, barangay, city"
          value={addressValue}
          onChange={(e) => setAddress(e.target.value)}
        />
        {/* Wraps to two rows on narrow phones instead of pushing the
            sheet wider than the screen. */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 basis-36"
            onClick={useMyLocation}
            disabled={locating}
          >
            <LocateFixedIcon />
            {locating ? "Locating…" : "Use my location"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 basis-36"
            onClick={() => setShowMap((v) => !v)}
          >
            <MapPinIcon />
            {showMap ? "Hide map" : "Pin on map"}
          </Button>
        </div>
        {showMap && (
          <div className="isolate h-[150px] overflow-hidden rounded-md border border-input">
            <LocationPicker key={mapKey} position={coords} onChange={applyLocation} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Pay with</SectionLabel>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
          {PAYMENT_METHODS.map((m) => {
            const selected = paymentMethod === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPaymentMethod(m.value)}
                className={cn(
                  "rounded-[5px] px-4 py-2.5 text-sm",
                  selected ? "border-2 border-primary font-bold" : "border-[1.5px] border-outline",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2.5 border-t pt-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{service.name}</span>
          <span>₱{service.price}</span>
        </div>
        {directPick && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Chosen barber</span>
            <span>₱{CHOSEN_BARBER_SURCHARGE}</span>
          </div>
        )}
        <div className="flex justify-between text-[19px] font-bold">
          <span>Total</span>
          <span>₱{total}</span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="h-14 text-lg" disabled={loading}>
          {loading ? "Requesting…" : "Request now"}
        </Button>
      </div>
    </form>
  );
}

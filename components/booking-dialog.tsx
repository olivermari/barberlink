"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LocateFixedIcon, MapPinIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/use-geolocation";
import { getCurrentPosition, LocationRequiredError } from "@/lib/get-current-position";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { LocationPicker } from "@/components/map/location-picker-lazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

const SURCHARGE = 50;

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash" },
  { value: "gcash", label: "GCash" },
] as const;

const ONLINE_METHODS = new Set(["gcash"]);

export function BookingDialog({
  barberId,
  service,
  directPick,
}: {
  barberId: string;
  service: Service;
  directPick: boolean;
}) {
  const router = useRouter();
  const { coords: defaultCoords } = useGeolocation();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coords = pin ?? defaultCoords;
  const total = directPick ? service.price + SURCHARGE : service.price;

  async function applyLocation(next: { lat: number; lng: number }) {
    setPin(next);
    const label = await reverseGeocode(next.lat, next.lng);
    if (label) setAddress(label);
  }

  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const fresh = await getCurrentPosition();
      await applyLocation(fresh);
    } catch (err) {
      toast.error(
        err instanceof LocationRequiredError
          ? err.message
          : "Couldn't get your location. Try again.",
      );
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    const baseFee = Math.round(service.price * feePercent) / 100;
    const platformFee = directPick ? baseFee + SURCHARGE : baseFee;
    const barberPayout = Math.round((service.price - baseFee) * 100) / 100;

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        barber_id: barberId,
        service_id: service.id,
        address_text: address,
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

    if (ONLINE_METHODS.has(paymentMethod)) {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const payment = await res.json();

      setLoading(false);

      if (!res.ok) {
        setError(payment.error ?? "Payment couldn't be started.");
        return;
      }

      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
        return;
      }

      toast.success(
        "Payment simulated — PayMongo isn't configured yet, so this booking was marked paid automatically for testing.",
      );
    } else {
      setLoading(false);
    }

    setOpen(false);
    toast.success(
      booking.status === "queued"
        ? "You're in the queue — this barber is currently busy."
        : "Request sent!",
    );
    router.push(`/customer/bookings/${booking.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Book</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {service.name}</DialogTitle>
          <DialogDescription>
            ₱{service.price} · {service.duration_minutes} min
            {directPick && ` · +₱${SURCHARGE} to choose this barber`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Street, barangay, city"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseCurrentLocation}
                disabled={locating}
              >
                <LocateFixedIcon />
                {locating ? "Locating..." : "Use current location"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMap((v) => !v)}
              >
                <MapPinIcon />
                {showMap ? "Hide map" : "Pin on map"}
              </Button>
            </div>
            {showMap && (
              <div className="h-48 w-full overflow-hidden rounded-lg border">
                <LocationPicker position={coords} onChange={applyLocation} />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {pin
                ? "Pin set — the address above is editable if it's not quite right."
                : "Type your address, or use the buttons above to set your exact pin."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentMethod">Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => value && setPaymentMethod(value)}
            >
              <SelectTrigger id="paymentMethod" className="w-full">
                <SelectValue>
                  {(value: string) =>
                    PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm font-medium">Total: ₱{total}</p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Requesting..." : "Request now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

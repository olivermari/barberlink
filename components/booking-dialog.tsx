"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/use-geolocation";
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

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

const SURCHARGE = 50;

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
  const { coords } = useGeolocation();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = directPick ? service.price + SURCHARGE : service.price;

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
      })
      .select("id, status")
      .single();

    setLoading(false);

    if (insertError || !booking) {
      setError(insertError?.message ?? "Something went wrong.");
      return;
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
            <p className="text-xs text-muted-foreground">
              We&apos;ll use your device&apos;s current location as your pin —
              make sure it&apos;s enabled.
            </p>
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

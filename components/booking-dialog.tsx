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

export function BookingDialog({
  barberId,
  service,
}: {
  barberId: string;
  service: Service;
}) {
  const router = useRouter();
  const { coords } = useGeolocation();
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const platformFee = Math.round(service.price * feePercent) / 100;
    const barberPayout = Math.round((service.price - platformFee) * 100) / 100;

    const { error: insertError } = await supabase.from("bookings").insert({
      customer_id: user.id,
      barber_id: barberId,
      service_id: service.id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      address_text: address,
      address_lat: coords.lat,
      address_lng: coords.lng,
      price: service.price,
      platform_fee: platformFee,
      barber_payout: barberPayout,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setOpen(false);
    toast.success(`Booked ${service.name}`);
    router.push("/customer/bookings");
    router.refresh();
  }

  const [minDateTime] = useState(() =>
    new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Book</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {service.name}</DialogTitle>
          <DialogDescription>
            ₱{service.price} · {service.duration_minutes} min
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="scheduledAt">Date &amp; time</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              min={minDateTime}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Booking..." : "Confirm booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

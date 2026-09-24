import type { createClient } from "@/lib/supabase/server";
import { distanceKm } from "@/lib/distance";
import { nowMs } from "@/lib/format";

type Client = Awaited<ReturnType<typeof createClient>>;
type Point = { lat: number; lng: number };

export const DEFAULT_REQUEST_TIMEOUT_SECONDS = 40;

export type PendingRequest = {
  id: string;
  serviceName: string;
  durationMinutes: number | null;
  customerName: string;
  addressText: string;
  spot: Point;
  barber: Point | null;
  payout: number;
  paymentMethod: string | null;
  distanceKm: number | null;
  timeoutSeconds: number;
  // Absolute epoch ms; null for requests opened before 0017.
  deadlineMs: number | null;
  serverNowMs: number;
};

// The barber's open request — dispatch never gives a barber two at once
// — with everything the B2 interrupt shows. Server-only.
export async function getPendingRequest(
  supabase: Client,
  barberId: string,
  barber: Point | null,
): Promise<PendingRequest | null> {
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, service_id, customer_id, address_text, address_lat, address_lng, barber_payout, payment_method, pending_since",
    )
    .eq("barber_id", barberId)
    .eq("status", "pending")
    .order("pending_since", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!booking) return null;

  const [{ data: service }, { data: customer }, { data: setting }] = await Promise.all([
    booking.service_id
      ? supabase
          .from("services")
          .select("name, duration_minutes")
          .eq("id", booking.service_id)
          .single()
      : Promise.resolve({ data: null as { name: string; duration_minutes: number } | null }),
    supabase.from("profiles").select("full_name").eq("id", booking.customer_id).single(),
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "request_timeout_seconds")
      .maybeSingle(),
  ]);

  const timeoutSeconds = Number(setting?.value) || DEFAULT_REQUEST_TIMEOUT_SECONDS;
  const spot = { lat: booking.address_lat, lng: booking.address_lng };

  return {
    id: booking.id,
    serviceName: service?.name ?? "Service",
    durationMinutes: service?.duration_minutes ?? null,
    customerName: customer?.full_name ?? "Customer",
    addressText: booking.address_text,
    spot,
    barber,
    payout: Number(booking.barber_payout),
    paymentMethod: booking.payment_method,
    distanceKm: barber ? distanceKm(barber, spot) : null,
    timeoutSeconds,
    deadlineMs: booking.pending_since
      ? new Date(booking.pending_since).getTime() + timeoutSeconds * 1000
      : null,
    serverNowMs: nowMs(),
  };
}

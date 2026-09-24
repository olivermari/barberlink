import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";

export type PaymentMethod = "cod" | "gcash";

// Cash and GCash only — GCash is the one online method wired to PayMongo
// (PR #1), so it's the only one offered.
export const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: "cod", label: "Cash on completion", hint: "Pay your barber in cash when the cut is done." },
  { value: "gcash", label: "GCash", hint: "Pay online with GCash right after you confirm." },
];

export function paymentLabel(method: PaymentMethod) {
  return PAYMENT_OPTIONS.find((o) => o.value === method)?.label ?? method;
}

// Service price, plus the ₱50 when the customer picked the barber
// themselves (Quick Match has no surcharge).
export function bookingTotal(servicePrice: number, chosen: boolean) {
  return chosen ? servicePrice + CHOSEN_BARBER_SURCHARGE : servicePrice;
}

type Input = {
  barberId: string;
  serviceId: string;
  servicePrice: number;
  chosen: boolean;
  address: string;
  lat: number;
  lng: number;
  paymentMethod: PaymentMethod;
};

// Confirm Booking. The database dispatches (pending vs queued) and
// guards duplicates (0007, 0027); this only supplies the row. Returns
// where to go next: the Track tab, or PayMongo's checkout for GCash.
export async function createBooking(
  input: Input,
): Promise<{ error: string } | { redirect: string; external?: boolean; queued: boolean }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in to book." };

  const { data: feeSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "fee_percentage")
    .single();

  const total = bookingTotal(input.servicePrice, input.chosen);
  const feePercent = Number(feeSetting?.value ?? 10);
  // The commission applies to the whole charge, chosen-barber surcharge
  // included — not just the service price.
  const platformFee = Math.round(total * feePercent) / 100;
  const barberPayout = Math.round((total - platformFee) * 100) / 100;

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      customer_id: user.id,
      barber_id: input.barberId,
      service_id: input.serviceId,
      address_text: input.address.trim(),
      address_lat: input.lat,
      address_lng: input.lng,
      price: total,
      platform_fee: platformFee,
      barber_payout: barberPayout,
      payment_method: input.paymentMethod,
      dispatch_mode: input.chosen ? "chosen" : "quick",
    })
    .select("id, status")
    .single();

  if (error || !booking) return { error: friendlyError(error, "Something went wrong.") };

  const queued = booking.status === "queued";

  if (input.paymentMethod === "gcash") {
    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id }),
    });
    const payment = await res.json();
    if (!res.ok) return { error: payment.error ?? "Payment couldn't be started." };
    if (payment.checkoutUrl) return { redirect: payment.checkoutUrl, external: true, queued };
  }

  // A freshly created booking is always active (pending or queued), so
  // it's always what Track will show.
  return { redirect: "/customer/track", queued };
}

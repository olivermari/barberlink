import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createGcashPayment } from "@/lib/paymongo";

// PayMongo won't open a payment under ₱20; the ceiling matches the tips
// check constraint in 0016.
const MIN_TIP = 20;
const MAX_TIP = 5000;

// Tips always go through GCash (C6): a cash tip after the barber has
// left can't happen in person.
export async function POST(request: Request) {
  const { bookingId, amount } = await request.json();

  if (typeof bookingId !== "string") {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
  }
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < MIN_TIP ||
    amount > MAX_TIP
  ) {
    return NextResponse.json(
      { error: `Tips run from ₱${MIN_TIP} to ₱5,000.` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, barber_id, status")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Not your booking." }, { status: 403 });
  }
  if (booking.status !== "completed") {
    return NextResponse.json({ error: "You can tip once the cut is done." }, { status: 400 });
  }

  const { data: paidTip } = await supabase
    .from("tips")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("status", "paid")
    .maybeSingle();

  if (paidTip) {
    return NextResponse.json({ error: "You've already tipped for this cut." }, { status: 409 });
  }

  const tipId = randomUUID();
  const tipRow = {
    id: tipId,
    booking_id: booking.id,
    customer_id: user.id,
    barber_id: booking.barber_id,
    amount,
    method: "gcash",
    status: "pending",
  };

  if (!process.env.PAYMONGO_SECRET_KEY) {
    // Simulated path (development without PayMongo keys). Customers have
    // no update policy on tips, so settling needs the service role —
    // without it there's no honest way to mark a tip paid.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Tipping isn't set up yet." }, { status: 503 });
    }

    const { error: insertError } = await supabase
      .from("tips")
      .insert({ ...tipRow, provider: "simulated" });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { error: settleError } = await createServiceRoleClient()
      .from("tips")
      .update({ status: "paid" })
      .eq("id", tipId);
    if (settleError) {
      return NextResponse.json({ error: settleError.message }, { status: 500 });
    }

    return NextResponse.json({ simulated: true });
  }

  const origin = new URL(request.url).origin;

  try {
    const payment = await createGcashPayment({
      amount,
      bookingId: `tip-${tipId}`,
      returnUrl: `${origin}/customer/bookings/${booking.id}`,
    });

    // The intent is created before the row so provider_payment_id goes
    // in with the insert — there's no customer update policy to add it
    // afterwards. The webhook marks the tip paid.
    const { error: insertError } = await supabase.from("tips").insert({
      ...tipRow,
      provider: "paymongo",
      provider_payment_id: payment.id,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl: payment.checkoutUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayMongo request failed." },
      { status: 502 },
    );
  }
}

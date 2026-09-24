import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createGcashPayment } from "@/lib/paymongo";

const ONLINE_METHODS = ["gcash"];

export async function POST(request: Request) {
  const { bookingId } = await request.json();
  if (typeof bookingId !== "string") {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
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
    .select("id, customer_id, payment_method, payment_status, price")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Not your booking." }, { status: 403 });
  }
  if (!booking.payment_method || !ONLINE_METHODS.includes(booking.payment_method)) {
    return NextResponse.json(
      { error: "This booking isn't set up for an online payment method." },
      { status: 400 },
    );
  }
  if (booking.payment_status === "paid") {
    return NextResponse.json({ simulated: true, alreadyPaid: true });
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    // Simulated path (local dev without PayMongo keys): marks the payment
    // settled immediately so the rest of the pipeline stays testable.
    // Never on the live site — a missing key there would hand out free
    // "paid" bookings.
    if (process.env.VERCEL_ENV === "production" || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Online payments aren't set up yet." }, { status: 503 });
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      booking_id: booking.id,
      provider: "simulated",
      method: booking.payment_method,
      amount: booking.price,
      status: "paid",
    });
    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // Service role: bookings_guard (0022) doesn't let customers settle
    // their own payment_status.
    const { data: settled, error: bookingError } = await createServiceRoleClient()
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", booking.id)
      .select("id")
      .maybeSingle();

    if (bookingError || !settled) {
      return NextResponse.json(
        { error: bookingError?.message ?? "Couldn't mark the booking as paid." },
        { status: 500 },
      );
    }

    return NextResponse.json({ simulated: true });
  }

  const origin = new URL(request.url).origin;

  try {
    const payment = await createGcashPayment({
      amount: booking.price,
      bookingId: booking.id,
      // This is always a freshly created, still-active booking (a tip
      // payment, which happens after completion, has its own return URL
      // in app/api/payments/tip/route.ts) — Track is where it belongs.
      returnUrl: `${origin}/customer/track`,
    });

    await supabase.from("payments").insert({
      booking_id: booking.id,
      provider: "paymongo",
      provider_payment_id: payment.id,
      method: booking.payment_method,
      amount: booking.price,
      status: "pending",
    });

    return NextResponse.json({ checkoutUrl: payment.checkoutUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayMongo request failed." },
      { status: 502 },
    );
  }
}

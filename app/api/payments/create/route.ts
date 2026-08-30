import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSource } from "@/lib/paymongo";

const ONLINE_METHODS = ["gcash", "maya", "card", "instapay"];

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
    // Simulated path: no PayMongo keys configured yet. Marks the
    // payment as settled immediately so the rest of the pipeline
    // (token ledger crediting on completion) is fully testable without
    // real credentials — swap this out once PAYMONGO_SECRET_KEY is set.
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

    const { data: settled, error: bookingError } = await supabase
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", booking.id)
      .select("id")
      .maybeSingle();

    // RLS silently returns zero rows (no error) rather than failing
    // when a policy blocks the update — check explicitly rather than
    // trusting a null `error` to mean the write actually happened.
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
    const source = await createSource({
      amount: booking.price,
      method: booking.payment_method as "gcash" | "maya" | "card" | "instapay",
      bookingId: booking.id,
      redirectSuccessUrl: `${origin}/customer/bookings/${booking.id}?payment=success`,
      redirectFailedUrl: `${origin}/customer/bookings/${booking.id}?payment=failed`,
    });

    await supabase.from("payments").insert({
      booking_id: booking.id,
      provider: "paymongo",
      provider_payment_id: source.id,
      method: booking.payment_method,
      amount: booking.price,
      status: "pending",
    });

    return NextResponse.json({ checkoutUrl: source.checkoutUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayMongo request failed." },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// PayMongo calls this server-to-server (no user session), so it needs
// the service-role client below to write past RLS.
//
// Event payload shapes for payment_intent.succeeded / payment.paid /
// payment.failed aren't fully documented in what's publicly fetchable
// right now — the id extraction below is a best-effort read of a
// couple of known field paths, not confirmed against a real event.
// This needs a live test webhook from your sandbox to verify; if it
// doesn't fire correctly, log the raw payload here and adjust.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event?.data?.attributes?.type as string | undefined;
  const resource = event?.data?.attributes?.data;

  const matchesEvent =
    eventType === "payment_intent.succeeded" ||
    eventType === "payment.paid" ||
    eventType === "payment.failed";

  if (!matchesEvent) {
    return NextResponse.json({ received: true });
  }

  // payment_intent.* events: the resource IS the payment intent, so
  // its own id is what we stored as provider_payment_id. payment.*
  // events: the resource is a Payment, which references its parent
  // intent — try the common field name, falling back to the
  // payment's own id in case that assumption is wrong.
  const paymentIntentId: string | undefined = eventType.startsWith("payment_intent.")
    ? resource?.id
    : (resource?.attributes?.payment_intent_id ?? resource?.id);

  if (!paymentIntentId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceRoleClient();
  const nextStatus = eventType === "payment.failed" ? "failed" : "paid";

  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id")
    .eq("provider_payment_id", paymentIntentId)
    .maybeSingle();

  if (payment) {
    await supabase.from("payments").update({ status: nextStatus }).eq("id", payment.id);
    await supabase
      .from("bookings")
      .update({ payment_status: nextStatus })
      .eq("id", payment.booking_id);
    return NextResponse.json({ received: true });
  }

  const { data: topup } = await supabase
    .from("wallet_topups")
    .select("id")
    .eq("provider_payment_id", paymentIntentId)
    .maybeSingle();

  if (topup) {
    await supabase.from("wallet_topups").update({ status: nextStatus }).eq("id", topup.id);
    return NextResponse.json({ received: true });
  }

  // Tips (0016). credit_tip only books the ledger entry on the
  // transition to paid, so a replayed event can't credit twice.
  const { data: tip } = await supabase
    .from("tips")
    .select("id")
    .eq("provider_payment_id", paymentIntentId)
    .maybeSingle();

  if (tip) {
    await supabase.from("tips").update({ status: nextStatus }).eq("id", tip.id);
  }

  return NextResponse.json({ received: true });
}

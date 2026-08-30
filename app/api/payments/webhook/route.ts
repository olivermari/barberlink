import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// PayMongo calls this server-to-server (no user session), so it needs
// the service-role client below to write past RLS. Structurally
// correct against PayMongo's documented event shape, but untestable
// in this environment without real sandbox keys and a live webhook
// delivery — verify this end to end once PAYMONGO_WEBHOOK_SECRET and
// PAYMONGO_SECRET_KEY are both set.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event?.data?.attributes?.type as string | undefined;
  const resource = event?.data?.attributes?.data;
  const sourceId: string | undefined =
    resource?.attributes?.source?.id ?? resource?.id;

  if (!sourceId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceRoleClient();
  const nextStatus = eventType === "payment.failed" ? "failed" : "paid";
  const matchesEvent = eventType === "payment.paid" || eventType === "source.chargeable" || eventType === "payment.failed";

  if (!matchesEvent) {
    return NextResponse.json({ received: true });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id")
    .eq("provider_payment_id", sourceId)
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
    .eq("provider_payment_id", sourceId)
    .maybeSingle();

  if (topup) {
    await supabase.from("wallet_topups").update({ status: nextStatus }).eq("id", topup.id);
  }

  return NextResponse.json({ received: true });
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createGcashPayment } from "@/lib/paymongo";

const ONLINE_METHODS = ["gcash"];
// PayMongo won't open a payment under ₱20.
const MIN_TOPUP = 20;
const MAX_TOPUP = 50_000;

export async function POST(request: Request) {
  const { amount, method } = await request.json();

  if (typeof amount !== "number" || amount < MIN_TOPUP || amount > MAX_TOPUP) {
    return NextResponse.json(
      { error: `Top up between ₱${MIN_TOPUP} and ₱50,000.` },
      { status: 400 },
    );
  }
  if (typeof method !== "string" || !ONLINE_METHODS.includes(method)) {
    return NextResponse.json({ error: "Choose a payment method." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const topupId = randomUUID();
  const row = { id: topupId, barber_id: user.id, amount, method, status: "pending" };

  if (!process.env.PAYMONGO_SECRET_KEY) {
    // Simulated path (development without PayMongo keys). Barbers can't
    // settle their own top-ups (0017 dropped that policy — it let a
    // barber credit money that was never received), so this needs the
    // service role, as the webhook does. Never on the live site.
    if (process.env.VERCEL_ENV === "production" || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Top-ups aren't set up yet." }, { status: 503 });
    }

    const { error: insertError } = await supabase
      .from("wallet_topups")
      .insert({ ...row, provider: "simulated" });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { error: settleError } = await createServiceRoleClient()
      .from("wallet_topups")
      .update({ status: "paid" })
      .eq("id", topupId);
    if (settleError) {
      return NextResponse.json({ error: settleError.message }, { status: 500 });
    }

    return NextResponse.json({ simulated: true });
  }

  const origin = new URL(request.url).origin;

  try {
    const payment = await createGcashPayment({
      amount,
      bookingId: `topup-${topupId}`,
      returnUrl: `${origin}/barber/earnings`,
    });

    // The intent exists before the row, so provider_payment_id goes in
    // with the insert — barbers have no update policy on top-ups. The
    // webhook marks it paid.
    const { error: insertError } = await supabase.from("wallet_topups").insert({
      ...row,
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

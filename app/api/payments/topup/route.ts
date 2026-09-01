import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGcashPayment } from "@/lib/paymongo";

const ONLINE_METHODS = ["gcash"];

export async function POST(request: Request) {
  const { amount, method } = await request.json();

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid top-up amount." }, { status: 400 });
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

  const { data: topup, error: insertError } = await supabase
    .from("wallet_topups")
    .insert({ barber_id: user.id, amount, method, status: "pending" })
    .select("id")
    .single();

  if (insertError || !topup) {
    return NextResponse.json(
      { error: insertError?.message ?? "Couldn't start the top-up." },
      { status: 500 },
    );
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    // Simulated path — see app/api/payments/create/route.ts for the
    // same pattern applied to booking payments.
    const { data: settled, error: settleError } = await supabase
      .from("wallet_topups")
      .update({ status: "paid" })
      .eq("id", topup.id)
      .select("id")
      .maybeSingle();

    // RLS silently returns zero rows (no error) rather than failing
    // when a policy blocks the update — check explicitly rather than
    // trusting a null `error` to mean the write actually happened.
    if (settleError || !settled) {
      return NextResponse.json(
        { error: settleError?.message ?? "Couldn't settle the top-up." },
        { status: 500 },
      );
    }

    return NextResponse.json({ simulated: true });
  }

  const origin = new URL(request.url).origin;

  try {
    const payment = await createGcashPayment({
      amount,
      bookingId: `topup-${topup.id}`,
      returnUrl: `${origin}/barber/earnings`,
    });

    await supabase
      .from("wallet_topups")
      .update({ provider_payment_id: payment.id })
      .eq("id", topup.id);

    return NextResponse.json({ checkoutUrl: payment.checkoutUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayMongo request failed." },
      { status: 502 },
    );
  }
}

// Thin wrapper around PayMongo's Sources API (https://developers.paymongo.com).
// Only ever called when PAYMONGO_SECRET_KEY is configured — see
// app/api/payments/create/route.ts for the simulated fallback used
// during development without real keys. Untestable in this environment
// without real sandbox credentials.

import { createHmac, timingSafeEqual } from "node:crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1";

type OnlinePaymentMethod = "gcash" | "maya" | "card" | "instapay" | "paymaya";

export async function createSource({
  amount,
  method,
  bookingId,
  redirectSuccessUrl,
  redirectFailedUrl,
}: {
  amount: number;
  method: OnlinePaymentMethod;
  bookingId: string;
  redirectSuccessUrl: string;
  redirectFailedUrl: string;
}) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  // PayMongo's `sources` type accepts "gcash" or "paymaya" (their name
  // for Maya) — everything else (card, instapay) is a separate v1
  // payment-intent flow not implemented here yet.
  const sourceType = method === "maya" ? "paymaya" : method;

  const res = await fetch(`${PAYMONGO_API}/sources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(amount * 100), // PayMongo amounts are centavos
          currency: "PHP",
          type: sourceType,
          redirect: {
            success: redirectSuccessUrl,
            failed: redirectFailedUrl,
          },
          metadata: { booking_id: bookingId },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayMongo source creation failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return {
    id: json.data.id as string,
    checkoutUrl: json.data.attributes.redirect.checkout_url as string,
  };
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureHeader) return false;

  // PayMongo signature header shape: "t=<timestamp>,te=<test_sig>,li=<live_sig>"
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.li ?? parts.te;
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

// Thin wrapper around PayMongo's Payment Intent workflow
// (https://docs.paymongo.com/docs/payment-acceptance-introduction) —
// the currently-recommended flow, replacing the older Sources API.
// GCash only, per product decision. Only called when
// PAYMONGO_SECRET_KEY is configured — see app/api/payments/create's
// simulated fallback used during development without real keys.

import { createHmac, timingSafeEqual } from "node:crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1";

function authHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function paymongoFetch(path: string, secretKey: string, body: unknown) {
  const res = await fetch(`${PAYMONGO_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(secretKey),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`PayMongo ${path} failed: ${res.status} ${errBody}`);
  }

  return res.json();
}

// 1) create a Payment Intent, 2) create a GCash Payment Method,
// 3) attach the method to the intent — the attach response carries
// the checkout redirect URL. All three calls run server-side with the
// secret key, so no PayMongo client SDK is needed anywhere.
export async function createGcashPayment({
  amount,
  bookingId,
  returnUrl,
}: {
  amount: number;
  bookingId: string;
  returnUrl: string;
}) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  const intent = await paymongoFetch("/payment_intents", secretKey, {
    data: {
      attributes: {
        amount: Math.round(amount * 100), // PayMongo amounts are centavos
        payment_method_allowed: ["gcash"],
        currency: "PHP",
        metadata: { booking_id: bookingId },
      },
    },
  });
  const paymentIntentId: string = intent.data.id;

  const method = await paymongoFetch("/payment_methods", secretKey, {
    data: { attributes: { type: "gcash" } },
  });
  const paymentMethodId: string = method.data.id;

  const attached = await paymongoFetch(
    `/payment_intents/${paymentIntentId}/attach`,
    secretKey,
    {
      data: {
        attributes: {
          payment_method: paymentMethodId,
          return_url: returnUrl,
        },
      },
    },
  );

  const checkoutUrl: string | undefined =
    attached.data?.attributes?.next_action?.redirect?.url;
  if (!checkoutUrl) {
    throw new Error("PayMongo didn't return a checkout redirect URL.");
  }

  return { id: paymentIntentId, checkoutUrl };
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

import { NextResponse } from "next/server";
import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Called by Postgres (supabase/migrations/0025_push_dispatch_infra.sql's
// push_notify(), via pg_net) whenever a trigger in 0026 decides someone
// needs a push — never called from the browser. Auth is the shared
// secret, same pattern as /api/keep-alive's CRON_SECRET.
export async function POST(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: "Push isn't configured." }, { status: 503 });
  }

  const { userIds, title, body, url, tag } = await request.json();
  if (!Array.isArray(userIds) || userIds.length === 0 || typeof title !== "string") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createServiceRoleClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .in("user_id", userIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = JSON.stringify({ title, body, url, tag });
  const staleIds: string[] = [];

  await Promise.all(
    (subscriptions ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload,
        );
      } catch (err) {
        // 404/410: the browser revoked this subscription — stop trying it.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
      }
    }),
  );

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ ok: true, sent: (subscriptions?.length ?? 0) - staleIds.length });
}

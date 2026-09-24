import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Called by lib/notifications.ts's ensurePushSubscription() right after
// the browser hands back a PushSubscription. Cookie-auth'd (not service
// role) — RLS's push_subscriptions_owner_insert/_update already scopes
// this to the caller's own row, keyed by endpoint so re-subscribing the
// same device (e.g. a healed subscription) upserts instead of duplicating.
export async function POST(request: Request) {
  const { endpoint, keys } = await request.json();
  if (typeof endpoint !== "string" || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

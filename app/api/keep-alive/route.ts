import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Daily Vercel cron (vercel.json). Free Supabase projects pause after 7
// days without activity, which would take the live site down between
// study sessions; one tiny read a day counts as activity.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error } = await supabase.from("platform_settings").select("key").limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ACTIVE = ["pending", "queued", "accepted", "on_the_way", "in_service"];

// Customer account deletion. Bookings, reviews and ledger rows reference
// the profile, so the row is anonymised rather than removed and the auth
// user is banned — the person can no longer sign in and their details are
// gone, while a barber's earnings history stays intact.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "customer") {
    return NextResponse.json({ error: "Only customer accounts can be deleted here." }, { status: 403 });
  }

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id)
    .in("status", ACTIVE);
  if (count) {
    return NextResponse.json(
      { error: "You have a booking in progress. Finish or cancel it before deleting your account." },
      { status: 409 },
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Account deletion isn't available right now." }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: "Deleted user", phone: null, avatar_url: null })
    .eq("id", user.id);
  if (profileError) return NextResponse.json({ error: "Couldn't delete your account." }, { status: 500 });

  await admin.from("saved_barbers").delete().eq("customer_id", user.id);
  await admin.storage.from("avatars").remove([`${user.id}/avatar`]);

  const { error: banError } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: "876000h",
    email: `deleted+${user.id}@barbero2go.invalid`,
  });
  if (banError) return NextResponse.json({ error: "Couldn't delete your account." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

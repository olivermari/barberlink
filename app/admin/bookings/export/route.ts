import { createClient } from "@/lib/supabase/server";
import {
  fetchBookingNames,
  fetchBookings,
  openDisputeBookingIds,
  parseBookingTab,
} from "@/lib/admin-bookings";

const MAX_ROWS = 5000;

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

// CSV of the same tab the bookings table shows (A3 "Export").
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated.", { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return new Response("Admins only.", { status: 403 });

  const tab = parseBookingTab(new URL(request.url).searchParams.get("tab") ?? undefined);
  const disputedIds = await openDisputeBookingIds(supabase);
  const rows = await fetchBookings(supabase, tab, disputedIds, MAX_ROWS);
  const names = await fetchBookingNames(supabase, rows);

  const header = [
    "id",
    "requested_at",
    "status",
    "decline_reason",
    "booked_via",
    "customer",
    "barber",
    "service",
    "address",
    "payment_method",
    "payment_status",
    "price",
    "platform_fee",
    "barber_payout",
  ];
  const lines = rows.map((b) =>
    [
      b.id,
      b.requested_at,
      b.status,
      b.decline_reason,
      b.dispatch_mode,
      names.person.get(b.customer_id),
      names.person.get(b.barber_id),
      names.service.get(b.service_id ?? ""),
      b.address_text,
      b.payment_method,
      b.payment_status,
      b.price,
      b.platform_fee,
      b.barber_payout,
    ]
      .map(csvCell)
      .join(","),
  );

  const date = new Date().toISOString().slice(0, 10);
  return new Response([header.join(","), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${tab}-${date}.csv"`,
    },
  });
}

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const BOOKING_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "queued", label: "Queued" },
  { value: "expired", label: "Expired" },
  { value: "disputed", label: "Disputed" },
] as const;

export type BookingTab = (typeof BOOKING_TABS)[number]["value"];

export const ACTIVE_STATUSES = ["pending", "accepted", "on_the_way", "in_service"];

const BOOKING_COLUMNS =
  "id, requested_at, pending_since, accepted_at, on_the_way_at, in_service_at, completed_at, status, decline_reason, dispatch_mode, customer_id, barber_id, service_id, address_text, payment_method, payment_status, price, platform_fee, barber_payout";

export type AdminBookingRow = {
  id: string;
  requested_at: string;
  pending_since: string | null;
  accepted_at: string | null;
  on_the_way_at: string | null;
  in_service_at: string | null;
  completed_at: string | null;
  status: string;
  decline_reason: string | null;
  dispatch_mode: string | null;
  customer_id: string;
  barber_id: string;
  service_id: string | null;
  address_text: string;
  payment_method: string | null;
  payment_status: string;
  price: number;
  platform_fee: number;
  barber_payout: number;
};

export function parseBookingTab(value: string | undefined): BookingTab {
  return BOOKING_TABS.find((t) => t.value === value)?.value ?? "all";
}

export function shortBookingId(id: string) {
  return `#${id.slice(0, 6).toUpperCase()}`;
}

export async function openDisputeBookingIds(supabase: Client) {
  const { data } = await supabase
    .from("disputes")
    .select("booking_id")
    .in("status", ["open", "investigating"]);
  return [...new Set((data ?? []).map((d) => d.booking_id as string))];
}

type Filter = { column: string; op: "in" | "eq"; value: string | string[] };

function tabFilters(tab: BookingTab, disputedIds: string[]): Filter[] {
  switch (tab) {
    case "active":
      return [{ column: "status", op: "in", value: ACTIVE_STATUSES }];
    case "queued":
      return [{ column: "status", op: "eq", value: "queued" }];
    case "expired":
      return [
        { column: "status", op: "eq", value: "declined" },
        { column: "decline_reason", op: "eq", value: "timeout" },
      ];
    case "disputed":
      return [{ column: "id", op: "in", value: disputedIds }];
    default:
      return [];
  }
}

// Shared by the bookings table and its CSV export, so both agree on
// what each tab contains.
export async function fetchBookings(
  supabase: Client,
  tab: BookingTab,
  disputedIds: string[],
  limit: number,
): Promise<AdminBookingRow[]> {
  if (tab === "disputed" && disputedIds.length === 0) return [];
  let query = supabase.from("bookings").select(BOOKING_COLUMNS);
  for (const f of tabFilters(tab, disputedIds)) {
    query =
      f.op === "in" ? query.in(f.column, f.value as string[]) : query.eq(f.column, f.value as string);
  }
  const { data } = await query.order("requested_at", { ascending: false }).limit(limit);
  return (data as AdminBookingRow[] | null) ?? [];
}

export async function countBookings(
  supabase: Client,
  tab: BookingTab,
  disputedIds: string[],
): Promise<number> {
  if (tab === "disputed") return disputedIds.length;
  let query = supabase.from("bookings").select("id", { count: "exact", head: true });
  for (const f of tabFilters(tab, disputedIds)) {
    query =
      f.op === "in" ? query.in(f.column, f.value as string[]) : query.eq(f.column, f.value as string);
  }
  const { count } = await query;
  return count ?? 0;
}

export async function fetchBookingById(supabase: Client, id: string) {
  const { data } = await supabase.from("bookings").select(BOOKING_COLUMNS).eq("id", id).maybeSingle();
  return (data as AdminBookingRow | null) ?? null;
}

// Names for a set of bookings: people (customers + barbers) and services.
export async function fetchBookingNames(supabase: Client, rows: AdminBookingRow[]) {
  const profileIds = [...new Set(rows.flatMap((r) => [r.customer_id, r.barber_id]))];
  const serviceIds = [...new Set(rows.map((r) => r.service_id).filter(Boolean))] as string[];

  const [{ data: profiles }, { data: services }] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  return {
    person: new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? "Unnamed"])),
    service: new Map((services ?? []).map((s) => [s.id as string, s.name as string])),
  };
}

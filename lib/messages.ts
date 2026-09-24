import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Conversation = {
  id: string; // booking id, or "support"
  name: string;
  avatarUrl: string | null;
  online: boolean;
  preview: string;
  mine: boolean;
  at: string;
  unread: number;
  support?: boolean;
};

// What the Barbero2Go Support row says: the most recent thing that
// happened to the customer's latest booking, in plain words.
export function updateText(status: string, barberName: string) {
  switch (status) {
    case "pending":
      return `Your request was sent to ${barberName}.`;
    case "queued":
      return `You're in ${barberName}'s queue.`;
    case "accepted":
      return `Your booking has been confirmed by ${barberName}.`;
    case "on_the_way":
      return `${barberName} is on the way.`;
    case "in_service":
      return "Your cut has started.";
    case "completed":
      return "Your booking is complete. Thanks for using Barbero2Go!";
    case "declined":
      return `${barberName} couldn't take your booking.`;
    case "cancelled":
      return "Your booking was cancelled.";
    default:
      return "Your booking was updated.";
  }
}

// One row per booking that has messages (newest first), plus the support
// row at its place in time. Reads only what RLS lets the customer see.
export async function loadConversations(
  supabase: Client,
  userId: string,
  role: "customer" | "barber" = "customer",
) {
  // The other person in each conversation: a customer sees their barbers,
  // a barber sees their customers.
  const mine = role === "customer" ? "customer_id" : "barber_id";
  const theirs = role === "customer" ? "barber_id" : "customer_id";
  const [{ data: messageRows }, { data: bookingRows }, unreadRes] = await Promise.all([
    supabase
      .from("booking_messages")
      .select("booking_id, sender_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("bookings")
      .select("id, barber_id, customer_id, status, updated_at, service_id")
      .eq(mine, userId)
      .order("updated_at", { ascending: false })
      .limit(60),
    supabase.rpc("unread_message_counts"),
  ]);

  const latest = new Map<string, { sender_id: string; body: string; created_at: string }>();
  for (const m of messageRows ?? []) {
    if (!latest.has(m.booking_id)) latest.set(m.booking_id, m);
  }
  const unreadBy = new Map(
    ((unreadRes.data ?? []) as { booking_id: string; unread: number }[]).map((u) => [
      u.booking_id,
      Number(u.unread),
    ]),
  );
  const bookings = new Map((bookingRows ?? []).map((b) => [b.id, b]));

  const barberIds = [...new Set((bookingRows ?? []).map((b) => b[theirs]))];
  const [{ data: profiles }, { data: barberProfiles }] = await Promise.all([
    barberIds.length
      ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", barberIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] }),
    barberIds.length
      ? supabase.from("barber_profiles").select("id, is_available").in("id", barberIds)
      : Promise.resolve({ data: [] as { id: string; is_available: boolean }[] }),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const onlineById = new Map((barberProfiles ?? []).map((p) => [p.id, p.is_available]));

  const conversations: Conversation[] = [];
  for (const [bookingId, m] of latest) {
    const b = bookings.get(bookingId);
    if (!b) continue;
    const p = profileById.get(b[theirs]);
    conversations.push({
      id: bookingId,
      name: p?.full_name ?? (role === "customer" ? "Barber" : "Customer"),
      avatarUrl: p?.avatar_url ?? null,
      online: role === "customer" ? (onlineById.get(b.barber_id) ?? false) : false,
      preview: m.body,
      mine: m.sender_id === userId,
      at: m.created_at,
      unread: unreadBy.get(bookingId) ?? 0,
    });
  }

  const newest = (bookingRows ?? [])[0];
  if (newest && role === "customer") {
    const p = profileById.get(newest.barber_id);
    conversations.push({
      id: "support",
      name: "Barbero2Go Support",
      avatarUrl: null,
      online: false,
      preview: updateText(newest.status, p?.full_name ?? "Your barber"),
      mine: false,
      at: newest.updated_at,
      unread: 0,
      support: true,
    });
  }

  conversations.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  return conversations;
}

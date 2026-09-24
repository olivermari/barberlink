import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatDayTime, formatPeso, formatThreadTime, nowMs } from "@/lib/format";
import { loadConversations, updateText } from "@/lib/messages";
import { BookingChat } from "@/components/chat/booking-chat";
import { LogoMarkSmall } from "@/components/brand/logo";
import { MessagesShell } from "@/components/customer/messages-shell";
import { QuickReplies, QUICK_REPLIES } from "@/components/customer/quick-replies";
import { Photo } from "@/components/customer/ui";
import { ReportProblemDialog } from "@/components/report-problem-dialog";
import { distanceKm } from "@/lib/distance";

const ACTIVE = ["queued", "pending", "accepted", "on_the_way", "in_service"];

const STATUS_WORDS: Record<string, string> = {
  queued: "in the queue",
  pending: "waiting to accept",
  accepted: "accepted",
  on_the_way: "on the way",
  in_service: "cutting now",
  completed: "completed",
  declined: "declined",
  cancelled: "cancelled",
};

const STATUS_TITLE: Record<string, string> = {
  queued: "In the queue",
  pending: "Waiting to accept",
  accepted: "Accepted",
  on_the_way: "On the Way",
  in_service: "In Progress",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const { user } = await requireProfile();
  const supabase = await createClient();
  const conversations = await loadConversations(supabase, user.id);
  const now = nowMs();
  const times = Object.fromEntries(conversations.map((c) => [c.id, formatThreadTime(c.at, now)]));

  // ——— Support: a read-only feed of what happened to your bookings ———
  if (bookingId === "support") {
    const { data: recent } = await supabase
      .from("bookings")
      .select("id, status, updated_at, barber_id")
      .eq("customer_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(15);
    const ids = [...new Set((recent ?? []).map((b) => b.barber_id))];
    const { data: names } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string | null }[] };
    const nameById = new Map((names ?? []).map((n) => [n.id, n.full_name ?? "Your barber"]));

    return (
      <MessagesShell
        conversations={conversations}
        times={times}
        activeId="support"
        pane={
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-line-soft px-[18px] py-3.5 lg:px-5">
              <Link href="/customer/messages" aria-label="Back to messages" className="-ml-1.5 flex size-8 items-center justify-center lg:hidden">
                <ChevronLeftIcon className="size-6" aria-hidden />
              </Link>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground">
                <LogoMarkSmall size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">Barbero2Go Support</span>
                <span className="text-[12.5px] text-[#6a635a]">Updates on your bookings</span>
              </div>
            </div>
            <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#faf8f3] p-5 [background-image:radial-gradient(#ece5d5_1px,transparent_1.2px)] [background-size:15px_15px]">
              {(recent ?? []).length === 0 && (
                <li className="text-sm text-[#6a635a]">Nothing yet — updates about your bookings will appear here.</li>
              )}
              {(recent ?? []).map((b) => (
                <li key={b.id}>
                  <Link
                    href={ACTIVE.includes(b.status) ? "/customer/track" : `/customer/history?b=${b.id}`}
                    className="flex max-w-[80%] flex-col gap-1 rounded-[12px_12px_12px_4px] border border-wash-border bg-white px-[13px] py-[11px] text-sm leading-[1.45] transition-colors hover:bg-wash"
                  >
                    {updateText(b.status, nameById.get(b.barber_id) ?? "Your barber")}
                    <span className="self-end text-[11px] text-[#a49c90]">{formatDayTime(b.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t border-line-soft px-5 py-3 text-[13px] text-[#6a635a]">
              Something wrong with a booking? Open it from History and choose Report an issue.
            </p>
          </div>
        }
      />
    );
  }

  // ——— A conversation with a barber ———
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, price, barber_id, service_id, address_text, address_lat, address_lng")
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!booking) notFound();

  const [{ data: profile }, { data: barber }, { data: service }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", booking.barber_id).single(),
    supabase
      .from("barber_profiles")
      .select("is_available, current_lat, current_lng")
      .eq("id", booking.barber_id)
      .single(),
    booking.service_id
      ? supabase.from("services").select("name").eq("id", booking.service_id).single()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  const barberName = profile?.full_name ?? "Barber";
  const online = barber?.is_available ?? false;
  const isActive = ACTIVE.includes(booking.status);
  const eta =
    booking.status === "on_the_way" && barber?.current_lat != null && barber?.current_lng != null
      ? Math.max(
          1,
          Math.round(
            ((distanceKm(
              { lat: barber.current_lat, lng: barber.current_lng },
              { lat: booking.address_lat, lng: booking.address_lng },
            ) *
              1.3) /
              20) *
              60,
          ),
        )
      : null;

  return (
    <MessagesShell
      conversations={conversations}
      times={times}
      activeId={bookingId}
      pane={
        <div className="flex h-[calc(100svh-4.5rem-env(safe-area-inset-bottom))] min-h-0 flex-col lg:h-auto lg:flex-1">
          <div className="flex items-center gap-3 border-b border-line-soft px-[18px] py-3.5 lg:px-5">
            <Link href="/customer/messages" aria-label="Back to messages" className="-ml-1.5 flex size-8 items-center justify-center lg:hidden">
              <ChevronLeftIcon className="size-6" aria-hidden />
            </Link>
            <Photo src={profile?.avatar_url} name={barberName} className="size-10" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-bold">{barberName}</span>
              <span className={online ? "text-[12.5px] font-semibold text-ok-fg" : "text-[12.5px] font-semibold text-[#6a635a]"}>
                {online ? "Online" : "Offline"} · {STATUS_WORDS[booking.status] ?? booking.status}
              </span>
            </div>
            <Link
              href={isActive ? "/customer/track" : `/customer/history?b=${booking.id}`}
              className="rounded-[9px] border border-field px-[13px] py-[9px] text-[13px] font-bold transition-colors hover:bg-wash"
            >
              {isActive ? "Track booking" : "View receipt"}
            </Link>
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-[#faf8f3] p-5 [background-image:radial-gradient(#ece5d5_1px,transparent_1.2px)] [background-size:15px_15px]">
            <BookingChat
              bookingId={booking.id}
              currentUserId={user.id}
              otherPartyLabel={barberName}
              otherPartyAvatarUrl={profile?.avatar_url}
              variant="customer"
              thread
              quickReplies={QUICK_REPLIES}
              quickRepliesMobileOnly
              className="flex-1"
            />
          </div>
        </div>
      }
      rail={
        <>
          <span className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">This booking</span>
          <div className="flex flex-col gap-[9px] rounded-[13px] border border-line bg-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold">{service?.name ?? "Booking"}</span>
              <span className="text-[15px] font-extrabold">{formatPeso(Number(booking.price))}</span>
            </div>
            <span className="text-[13px] text-[#6a635a]">{booking.address_text}</span>
            <div className="text-[13px] font-bold text-primary">
              {STATUS_TITLE[booking.status] ?? booking.status}
              {eta != null && ` · ETA ${eta} min`}
            </div>
          </div>
          <QuickReplies bookingId={booking.id} userId={user.id} />
          <div className="mt-auto">
            <ReportProblemDialog bookingId={booking.id} raisedBy={user.id} variant="ink" />
          </div>
        </>
      }
    />
  );
}

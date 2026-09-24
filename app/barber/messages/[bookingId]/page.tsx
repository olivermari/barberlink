import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatPeso, formatThreadTime, nowMs, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { loadConversations } from "@/lib/messages";
import { BookingChat } from "@/components/chat/booking-chat";
import { MessagesShell } from "@/components/customer/messages-shell";
import { DOTTED_RAIL, Photo } from "@/components/customer/ui";
import { cn } from "@/lib/utils";

const ACTIVE = ["accepted", "on_the_way", "in_service"];

const STATUS_WORDS: Record<string, string> = {
  queued: "in your queue",
  pending: "waiting for you",
  accepted: "accepted",
  on_the_way: "on the way",
  in_service: "in service",
  completed: "completed",
  declined: "declined",
  cancelled: "cancelled",
};

// The tap-to-send lines a barber types every time.
const QUICK_REPLIES = ["On my way", "I've arrived", "Running a few minutes late", "Which gate should I use?"];

export default async function BarberConversationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const { user } = await requireProfile();
  const supabase = await createClient();
  const conversations = await loadConversations(supabase, user.id, "barber");
  const now = nowMs();
  const times = Object.fromEntries(conversations.map((c) => [c.id, formatThreadTime(c.at, now)]));

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, price, barber_payout, customer_id, service_id, address_text, payment_method")
    .eq("id", bookingId)
    .eq("barber_id", user.id)
    .maybeSingle();
  if (!booking) notFound();

  const [{ data: customer }, { data: service }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", booking.customer_id).single(),
    booking.service_id
      ? supabase.from("services").select("name").eq("id", booking.service_id).single()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);
  const name = customer?.full_name ?? "Customer";
  const isActive = ACTIVE.includes(booking.status);
  // The thread stays readable afterwards, but messages only make sense while
  // there is a booking in play.
  const open = isActive || booking.status === "pending" || booking.status === "queued";

  return (
    <MessagesShell
      role="barber"
      conversations={conversations}
      times={times}
      activeId={bookingId}
      pane={
        <div className="flex h-[calc(100svh-4.5rem-env(safe-area-inset-bottom))] min-h-0 flex-col lg:h-auto lg:flex-1">
          <div className="flex items-center gap-3 border-b border-line-soft px-[18px] py-3.5 lg:px-5">
            <Link
              href="/barber/messages"
              aria-label="Back to messages"
              className="-ml-1.5 flex size-8 items-center justify-center lg:hidden"
            >
              <ChevronLeftIcon className="size-6" aria-hidden />
            </Link>
            <Photo src={customer?.avatar_url} name={name} className="size-10" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-bold">{name}</span>
              <span className="text-[12.5px] font-semibold text-[#6a635a]">
                {(service?.name ?? "Booking")} · {STATUS_WORDS[booking.status] ?? booking.status}
              </span>
            </div>
            {isActive && (
              <Link
                href="/barber/job"
                className="rounded-[9px] border border-field px-[13px] py-[9px] text-[13px] font-bold transition-colors hover:bg-wash"
              >
                Open job
              </Link>
            )}
          </div>
          <div className={cn("flex min-h-0 flex-1 flex-col p-5", DOTTED_RAIL)}>
            <BookingChat
              bookingId={booking.id}
              currentUserId={user.id}
              otherPartyLabel={name}
              otherPartyAvatarUrl={customer?.avatar_url}
              variant="customer"
              thread
              quickReplies={open ? QUICK_REPLIES : undefined}
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
            <span className="text-[13px] text-[#6a635a]">
              {PAYMENT_METHOD_LABEL[booking.payment_method ?? ""] ?? "—"} · you earn{" "}
              {formatPeso(Number(booking.barber_payout))}
            </span>
            <div className="text-[13px] font-bold text-primary">
              {STATUS_WORDS[booking.status] ?? booking.status}
            </div>
          </div>
        </>
      }
    />
  );
}
